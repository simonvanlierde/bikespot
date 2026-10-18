import "fake-indexeddb/auto";
// node:buffer's Blob survives fake-indexeddb's structured clone; jsdom's does not.
import { Blob as NodeBlob } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPhotoBlobs,
  deletePhotoBlob,
  downscalePhoto,
  listPhotoIds,
  loadPhotoBlob,
  savePhotoBlob,
} from "../src/lib/photos.ts";

// Structurally identical to the DOM Blob our code expects; cast once so call sites type-check.
const Blob = NodeBlob as unknown as typeof globalThis.Blob;

describe("photo blob store (IndexedDB)", () => {
  beforeEach(async () => {
    await clearPhotoBlobs();
  });

  it("saves a blob and reads it back by id", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const id = await savePhotoBlob(blob);

    expect(typeof id).toBe("string");
    const loaded = await loadPhotoBlob(id);
    expect(await loaded?.text()).toBe("hello");
  });

  it("returns null for an unknown id", async () => {
    expect(await loadPhotoBlob("nope")).toBeNull();
  });

  it("lists saved ids and drops them on delete", async () => {
    const a = await savePhotoBlob(new Blob(["a"]));
    const b = await savePhotoBlob(new Blob(["b"]));

    expect((await listPhotoIds()).sort()).toEqual([a, b].sort());

    await deletePhotoBlob(a);
    expect(await listPhotoIds()).toEqual([b]);
    expect(await loadPhotoBlob(a)).toBeNull();
  });

  it("rejects a save whose transaction aborts after the request succeeded", async () => {
    const put = IDBObjectStore.prototype.put;
    const spy = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof put>
    ) {
      const request = put.apply(this, args);
      request.addEventListener("success", () => this.transaction.abort());
      return request;
    });

    await expect(savePhotoBlob(new Blob(["lost"]))).rejects.toBeInstanceOf(Error);
    spy.mockRestore();
    expect(await listPhotoIds()).toEqual([]);
  });

  it("clears every stored blob", async () => {
    await savePhotoBlob(new Blob(["x"]));
    await clearPhotoBlobs();
    expect(await listPhotoIds()).toEqual([]);
  });
});

describe("downscalePhoto", () => {
  const photo = new File(["exif-laden"], "IMG_0001.HEIC", { type: "image/heic" });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubCanvas(width: number, height: number, encodes: string[]) {
    const drawImage = vi.fn();
    const close = vi.fn();
    const sizes: number[][] = [];
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width, height, close }));
    vi.stubGlobal(
      "OffscreenCanvas",
      class {
        width: number;
        height: number;
        constructor(w: number, h: number) {
          this.width = w;
          this.height = h;
          sizes.push([w, h]);
        }
        getContext() {
          return { drawImage };
        }
        convertToBlob({ type }: { type: string }) {
          // Mimics a browser that falls back to PNG for types it cannot encode.
          return Promise.resolve(
            new Blob(["clean"], { type: encodes.includes(type) ? type : "image/png" }),
          );
        }
      },
    );
    return { drawImage, close, sizes };
  }

  it("downscales the long edge to 1600 px and re-encodes to WebP", async () => {
    const { drawImage, close, sizes } = stubCanvas(4032, 3024, ["image/webp", "image/jpeg"]);

    const shrunk = await downscalePhoto(photo);

    expect(sizes).toEqual([[1600, 1200]]);
    expect(shrunk?.name).toBe("IMG_0001.webp");
    expect(shrunk?.type).toBe("image/webp");
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200);
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps a small photo at its own size", async () => {
    const { sizes } = stubCanvas(800, 1200, ["image/webp"]);

    await downscalePhoto(photo);

    expect(sizes).toEqual([[800, 1200]]);
  });

  it("falls back to JPEG where the browser cannot encode WebP", async () => {
    stubCanvas(3024, 4032, ["image/jpeg"]);

    const shrunk = await downscalePhoto(photo);

    expect(shrunk?.name).toBe("IMG_0001.jpg");
    expect(shrunk?.type).toBe("image/jpeg");
  });

  it("returns null when the browser lacks OffscreenCanvas", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn());
    vi.stubGlobal("OffscreenCanvas", undefined);

    expect(await downscalePhoto(photo)).toBeNull();
  });

  it("returns null when the photo cannot be decoded", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("bad image")));
    vi.stubGlobal("OffscreenCanvas", class {});

    expect(await downscalePhoto(photo)).toBeNull();
  });
});
