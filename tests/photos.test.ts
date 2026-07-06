import "fake-indexeddb/auto";
// node:buffer's Blob survives fake-indexeddb's structured clone; jsdom's does not.
import { Blob as NodeBlob } from "node:buffer";
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearPhotoBlobs,
  deletePhotoBlob,
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

  it("clears every stored blob", async () => {
    await savePhotoBlob(new Blob(["x"]));
    await clearPhotoBlobs();
    expect(await listPhotoIds()).toEqual([]);
  });
});
