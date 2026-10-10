import "fake-indexeddb/auto";
// node:buffer's Blob survives fake-indexeddb's structured clone; jsdom's does not.
import { Blob as NodeBlob } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPhotoBlobs,
  deletePhotoBlob,
  listPhotoIds,
  loadPhotoBlob,
  savePhotoBlob,
  stripPhotoMetadata,
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

  it("clears every stored blob", async () => {
    await savePhotoBlob(new Blob(["x"]));
    await clearPhotoBlobs();
    expect(await listPhotoIds()).toEqual([]);
  });
});

describe("stripPhotoMetadata", () => {
  const photo = new File(["exif-laden"], "IMG_0001.HEIC", { type: "image/heic" });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("re-encodes the photo to a JPEG through a canvas", async () => {
    const drawImage = vi.fn();
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 4, height: 3, close }));
    vi.stubGlobal(
      "OffscreenCanvas",
      class {
        getContext() {
          return { drawImage };
        }
        convertToBlob() {
          return Promise.resolve(new Blob(["clean"], { type: "image/jpeg" }));
        }
      },
    );

    const stripped = await stripPhotoMetadata(photo);

    expect(stripped?.name).toBe("IMG_0001.jpg");
    expect(stripped?.type).toBe("image/jpeg");
    expect(drawImage).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("returns null when the browser lacks OffscreenCanvas", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn());
    vi.stubGlobal("OffscreenCanvas", undefined);

    expect(await stripPhotoMetadata(photo)).toBeNull();
  });

  it("returns null when the photo cannot be decoded", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("bad image")));
    vi.stubGlobal("OffscreenCanvas", class {});

    expect(await stripPhotoMetadata(photo)).toBeNull();
  });
});
