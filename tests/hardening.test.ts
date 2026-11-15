import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";
import type { TargetedEvent } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "../src/lib/i18n.ts";
import { clearPhotoBlobs, listPhotoIds, loadPhotoBlob, savePhotoBlob } from "../src/lib/photos.ts";
import {
  APP_DATA_STORAGE_KEY,
  browserRepository,
  DRAFT_MAX_AGE_MS,
  DRAFT_STORAGE_KEY,
  UNREADABLE_BACKUP_KEY,
} from "../src/lib/repository.ts";
import { checkForUpdates } from "../src/lib/serviceWorkerUpdates.ts";
import { MAX_IMPORT_BYTES, parseSpotsFile } from "../src/lib/spotsTransfer.ts";
import { createStore } from "../src/lib/store.ts";
import { editorOf, sampleAppData, seedStorage } from "./fixtures.ts";

// node:buffer's Blob survives fake-indexeddb's structured clone; jsdom's does not.
const Blob = NodeBlob as unknown as typeof globalThis.Blob;

function fileEvent(file: File): TargetedEvent<HTMLInputElement> {
  const input = document.createElement("input");
  input.type = "file";
  Object.defineProperty(input, "files", { value: [file] });
  return { currentTarget: input } as unknown as TargetedEvent<HTMLInputElement>;
}

beforeEach(async () => {
  window.localStorage.clear();
  await clearPhotoBlobs();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("cross-tab sync", () => {
  it("adopts app data another tab saved, and does not write the stale copy back", () => {
    seedStorage();
    const store = createStore();
    const stop = store.start();
    const fresh = { ...sampleAppData, current: null };
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(fresh));
    window.dispatchEvent(new StorageEvent("storage", { key: APP_DATA_STORAGE_KEY, storageArea: window.localStorage }));

    expect(store.data.value.current).toBeNull();

    store.handleStationChange((draft) => ({ ...draft, name: "Other" }));

    const stored = JSON.parse(window.localStorage.getItem(APP_DATA_STORAGE_KEY) ?? "{}");
    expect(stored.current).toBeNull();
    stop();
  });

  it("ignores storage events for other keys", () => {
    seedStorage();
    const store = createStore();
    const stop = store.start();
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify({ ...sampleAppData, current: null }));
    window.dispatchEvent(new StorageEvent("storage", { key: "other", storageArea: window.localStorage }));

    expect(store.data.value.current).not.toBeNull();
    stop();
  });
});

describe("import hardening", () => {
  it("drops the photoId a file carries", () => {
    const spot = { ...sampleAppData.recent[0], photoId: "someone-elses-blob" };
    const parsed = parseSpotsFile(JSON.stringify({ version: 1, spots: [spot] }));

    expect(parsed?.[0]?.photoId).toBeUndefined();
  });

  it("refuses a file over the size cap without reading it", async () => {
    seedStorage();
    const store = createStore();
    const file = new File(["x".repeat(MAX_IMPORT_BYTES + 1)], "spots.json");
    const text = vi.spyOn(file, "text");

    await store.handleImportSpots(fileEvent(file));

    expect(text).not.toHaveBeenCalled();
    expect(store.notice.value).toEqual({ text: t.value.noticeImportInvalid, tone: "error" });
    expect(store.data.value).toEqual(sampleAppData);
  });
});

describe("reconcilePhotos", () => {
  it("still strips dangling photo ids when one orphan cannot be deleted", async () => {
    const orphan = await savePhotoBlob(new Blob(["orphan"]));
    const dangling = { ...sampleAppData, current: { ...sampleAppData.current!, photoId: "gone" } };
    vi.spyOn(IDBObjectStore.prototype, "delete").mockImplementation(() => {
      throw new Error("blocked");
    });

    const cleaned = await browserRepository.reconcilePhotos(dangling, () => true);

    expect(cleaned).not.toBeNull();
    expect(cleaned?.current?.photoId).toBeUndefined();
    expect(await listPhotoIds()).toContain(orphan);
  });
});

describe("restored draft", () => {
  it("is not restored once it is older than the draft age limit", () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        draft: { kind: "outside", notes: "stale", coords: null },
        showDetails: false,
        savedAt: new Date().toISOString(),
      }),
    );
    vi.useFakeTimers({ toFake: ["Date"] });
    const store = createStore();
    vi.setSystemTime(Date.now() + DRAFT_MAX_AGE_MS + 1000);

    store.openOverlay({ kind: "edit-location" });

    expect(editorOf(store).draft).not.toMatchObject({ notes: "stale" });
  });

  it("is dropped when the user collects the spot before opening the editor", async () => {
    seedStorage();
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        draft: { kind: "outside", notes: "stale", coords: null },
        showDetails: false,
        savedAt: new Date().toISOString(),
      }),
    );
    const store = createStore();

    await store.handleClearCurrent();
    store.openOverlay({ kind: "edit-location" });

    expect(editorOf(store).draft).not.toMatchObject({ notes: "stale" });
  });
});

describe("clear all data", () => {
  it("still clears photos and reports the failure when the draft cannot be cleared", async () => {
    vi.stubGlobal("confirm", () => true);
    const clearPhotos = vi.fn(() => Promise.resolve());
    const store = createStore({
      ...browserRepository,
      clearDraft: () => {
        throw new Error("blocked");
      },
      clearPhotos,
    });

    await store.handleClearAllData();

    expect(clearPhotos).toHaveBeenCalled();
    expect(store.notice.value?.tone).toBe("error");
  });
});

describe("clearing the unreadable copy during an undo window", () => {
  it("keeps the removed spot's photo so undo restores it whole", async () => {
    vi.stubGlobal("confirm", () => true);
    const photoId = await savePhotoBlob(new Blob(["photo"]));
    const record = { ...sampleAppData.recent[0]!, photoId };
    seedStorage({ ...sampleAppData, recent: [record] });
    window.localStorage.setItem(UNREADABLE_BACKUP_KEY, "{broken");
    const store = createStore();

    store.handleRemoveRecent(record.id);
    await store.handleClearUnreadable();
    store.notice.value?.undo?.();

    expect(store.data.value.recent[0]?.photoId).toBe(photoId);
    expect(await loadPhotoBlob(photoId)).not.toBeNull();
  });
});

describe("photo database connection", () => {
  it("reopens after the browser closed the cached connection", async () => {
    await savePhotoBlob(new Blob(["a"]));
    // Deleting the database makes the open connection close itself.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("bikespot-photos");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    const id = await savePhotoBlob(new Blob(["b"]));

    expect(await loadPhotoBlob(id)).not.toBeNull();
  });
});

describe("service worker update checks", () => {
  it("updates hourly and when the page becomes visible", () => {
    vi.useFakeTimers();
    const update = vi.fn(() => Promise.resolve());
    checkForUpdates({ update } as unknown as ServiceWorkerRegistration);

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("swallows an offline update failure", async () => {
    const update = vi.fn(() => Promise.reject(new Error("offline")));
    checkForUpdates({ update } as unknown as ServiceWorkerRegistration);

    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();

    expect(update).toHaveBeenCalled();
  });
});
