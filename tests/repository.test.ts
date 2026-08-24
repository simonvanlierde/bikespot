import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultAppData } from "../src/lib/defaults.ts";
import {
  clearPhotoBlobs,
  deletePhotoBlob,
  loadPhotoBlob,
  savePhotoBlob,
} from "../src/lib/photos.ts";
import { APP_DATA_STORAGE_KEY, loadAppData, saveAppData } from "../src/lib/repository.ts";
import { sampleAppData } from "./fixtures.ts";

describe("app data repository", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await clearPhotoBlobs();
  });

  it("hydrates the default app data when nothing has been stored yet", async () => {
    await expect(loadAppData()).resolves.toEqual(defaultAppData);
  });

  it("stores photo blobs outside localStorage and can read them back by photo id", async () => {
    const photoId = await savePhotoBlob(
      new File(["bike-photo"], "bike.png", { type: "image/png" }),
    );

    const nextData = {
      ...sampleAppData,
      current:
        sampleAppData.current && sampleAppData.current.mode === "station"
          ? {
              ...sampleAppData.current,
              photoId,
            }
          : sampleAppData.current,
    };

    await saveAppData(nextData);

    const persisted = window.localStorage.getItem(APP_DATA_STORAGE_KEY);

    expect(persisted).toContain(photoId);
    expect(persisted).not.toContain("bike-photo");
    expect(JSON.parse(persisted ?? "{}")).toMatchObject({
      current: {
        photoId,
      },
    });

    const hydrated = await loadAppData();

    expect(hydrated.current).toMatchObject({
      photoId,
    });
  });

  it("deletes a stored photo blob so orphaned photos do not accumulate", async () => {
    const photoId = await savePhotoBlob(
      new File(["bike-photo"], "bike.png", { type: "image/png" }),
    );

    expect(await loadPhotoBlob(photoId)).not.toBeNull();

    await deletePhotoBlob(photoId);

    expect(await loadPhotoBlob(photoId)).toBeNull();
  });

  it("round-trips valid coordinates and drops invalid ones on load", async () => {
    const base = sampleAppData.current;

    if (base?.mode !== "station") {
      throw new Error("expected a station current record in defaults");
    }

    window.localStorage.setItem(
      APP_DATA_STORAGE_KEY,
      JSON.stringify({
        ...sampleAppData,
        current: { ...base, coords: { lat: 52.379189, lng: 4.899431, accuracy: 12 } },
        recent: [
          { ...sampleAppData.recent[0], coords: { lat: 999, lng: 4.9 } },
          { ...sampleAppData.recent[0], id: "no-coords", coords: undefined },
        ],
      }),
    );

    const hydrated = await loadAppData();

    expect(hydrated.current?.coords).toEqual({ lat: 52.379189, lng: 4.899431, accuracy: 12 });
    // Out-of-range latitude is rejected, and records without coords still load.
    expect(hydrated.recent[0]?.coords).toBeUndefined();
    expect(hydrated.recent[1]?.coords).toBeUndefined();
  });

  it("keeps a valid current spot when the stored recent list is malformed", async () => {
    const base = sampleAppData.current;

    if (base?.mode !== "station") {
      throw new Error("expected a station current record in defaults");
    }

    window.localStorage.setItem(
      APP_DATA_STORAGE_KEY,
      JSON.stringify({ ...sampleAppData, recent: "not-an-array" }),
    );

    const hydrated = await loadAppData();

    expect(hydrated.current).toMatchObject({ id: base.id, lane: base.lane });
    expect(hydrated.recent).toEqual([]);
  });

  it("starts fresh when legacy versioned state is found", async () => {
    window.localStorage.setItem(
      APP_DATA_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        state: {
          ...sampleAppData,
          current: {
            ...sampleAppData.current,
            photoDataUrl: "data:image/png;base64,bGVnYWN5LXBob3Rv",
          },
        },
      }),
    );

    await expect(loadAppData()).resolves.toEqual(defaultAppData);
  });

  it("falls back to defaults when storage access throws", async () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await expect(loadAppData()).resolves.toEqual(defaultAppData);
    spy.mockRestore();
  });
});
