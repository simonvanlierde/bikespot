// Runs in real Chromium (see the browser project in vite.config.ts), so the
// canvas decodes and encodes actual image files.
import { describe, expect, it } from "vitest";

import { downscalePhoto, loadPhotoBlob, PHOTO_MAX_EDGE, savePhotoBlob } from "../src/lib/photos.ts";
import heicUrl from "./fixtures/photo.heic?url";
import largeJpegUrl from "./fixtures/photo-gps.jpg?url";
import smallJpegUrl from "./fixtures/photo-small.jpg?url";

async function fixture(url: string, name: string, type: string): Promise<File> {
  const response = await fetch(url);
  return new File([await response.blob()], name, { type });
}

async function sizeOf(blob: Blob): Promise<[number, number]> {
  const bitmap = await createImageBitmap(blob);
  const size: [number, number] = [bitmap.width, bitmap.height];
  bitmap.close();
  return size;
}

async function containsText(blob: Blob, text: string): Promise<boolean> {
  return new TextDecoder("latin1").decode(await blob.arrayBuffer()).includes(text);
}

describe("downscalePhoto with real images", () => {
  it("shrinks a large JPEG to the long edge and drops its EXIF", async () => {
    const original = await fixture(largeJpegUrl, "IMG_0001.JPG", "image/jpeg");
    expect(await containsText(original, "FixtureCam")).toBe(true);

    const shrunk = await downscalePhoto(original);

    expect(shrunk).not.toBeNull();
    expect(shrunk?.type).toBe("image/webp");
    expect(await sizeOf(shrunk as File)).toEqual([PHOTO_MAX_EDGE, 1200]);
    expect(shrunk?.size).toBeLessThan(original.size);
    expect(await containsText(shrunk as File, "FixtureCam")).toBe(false);
    expect(await containsText(shrunk as File, "Exif")).toBe(false);
  });

  it("keeps a small photo at its size but still drops its EXIF", async () => {
    const original = await fixture(smallJpegUrl, "small.jpg", "image/jpeg");

    const shrunk = await downscalePhoto(original);

    expect(await sizeOf(shrunk as File)).toEqual([640, 480]);
    expect(await containsText(shrunk as File, "FixtureCam")).toBe(false);
  });

  it("returns null for a HEIC photo the browser cannot decode", async () => {
    const original = await fixture(heicUrl, "IMG_0002.HEIC", "image/heic");

    expect(await downscalePhoto(original)).toBeNull();
  });

  it("stores the shrunk photo so it reads back as an image", async () => {
    const shrunk = await downscalePhoto(await fixture(largeJpegUrl, "a.jpg", "image/jpeg"));
    const id = await savePhotoBlob(shrunk as File);

    const loaded = await loadPhotoBlob(id);

    expect(await sizeOf(loaded as Blob)).toEqual([PHOTO_MAX_EDGE, 1200]);
  });
});
