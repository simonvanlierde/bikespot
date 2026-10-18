import type { TargetedEvent } from "preact";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { RECENT_LIMIT } from "../src/lib/app-data.ts";
import { createOutsideLocationDraft } from "../src/lib/drafts.ts";
import { t } from "../src/lib/i18n.ts";
import { browserRepository, type SpotRepository } from "../src/lib/repository.ts";
import { exportSpots } from "../src/lib/spotsTransfer.ts";
import { createStore, type Store, UNDO_WINDOW_MS } from "../src/lib/store.ts";
import { editorOf, sampleAppData } from "./fixtures.ts";

function stubGeolocation(impl: Parameters<typeof vi.fn>[0]) {
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: vi.fn(impl) } });
}

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as TargetedEvent<HTMLFormElement>;
}

describe("store handlers", () => {
  let store: Store;

  beforeEach(() => {
    window.localStorage.clear();
    store = createStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("handleCaptureLocation", () => {
    it("does nothing without an open location editor", async () => {
      await store.handleCaptureLocation();
      expect(store.overlay.value).toEqual({ kind: "closed" });
    });

    it("stores captured coords on the draft and clears the capturing state", async () => {
      store.openOverlay({ kind: "edit-location" });
      stubGeolocation((success: PositionCallback) => {
        success({
          coords: { latitude: 52.1, longitude: 4.2, accuracy: 8 },
        } as GeolocationPosition);
      });

      await store.handleCaptureLocation();

      expect(editorOf(store).geoStatus).toBe("idle");
      expect(editorOf(store).draft.coords).toEqual({ lat: 52.1, lng: 4.2, accuracy: 8 });
    });

    it("shows the capturing state while the fix is pending", () => {
      store.openOverlay({ kind: "edit-location" });
      stubGeolocation(() => undefined);

      // biome-ignore lint/complexity/noVoid: the fix never resolves in this test
      void store.handleCaptureLocation();

      expect(editorOf(store).geoStatus).toBe("capturing");
    });

    it("drops a fix that resolves after the editor was closed and reopened", async () => {
      store.openOverlay({ kind: "edit-location" });
      let resolveFix: PositionCallback = () => undefined;
      stubGeolocation((success: PositionCallback) => {
        resolveFix = success;
      });

      const pending = store.handleCaptureLocation();
      store.closeOverlay();
      store.openOverlay({ kind: "edit-location" });
      resolveFix({ coords: { latitude: 1, longitude: 2, accuracy: 3 } } as GeolocationPosition);
      await pending;

      expect(editorOf(store).draft.coords).toBeNull();
      expect(editorOf(store).geoStatus).toBe("idle");
    });

    it("flags an error when geolocation is unavailable", async () => {
      store.openOverlay({ kind: "edit-location" });
      vi.stubGlobal("navigator", {});

      await store.handleCaptureLocation();

      expect(editorOf(store).geoStatus).toBe("error");
    });

    it("flags an error when the lookup rejects", async () => {
      store.openOverlay({ kind: "edit-location" });
      stubGeolocation((_s: PositionCallback, error?: PositionErrorCallback) => {
        error?.({ code: 1, message: "denied" } as GeolocationPositionError);
      });

      await store.handleCaptureLocation();

      expect(editorOf(store).geoStatus).toBe("error");
    });
  });

  describe("handleStationChange", () => {
    it("applies every station change immediately, keeping the draft as typed", () => {
      store.openOverlay({ kind: "station-settings" });

      store.handleStationChange((previous) => ({ ...previous, name: "Amsterdam Zuid" }));
      expect(store.data.value.station.name).toBe("Amsterdam Zuid");

      // A half-typed blank preset stays in the draft but is dropped from config.
      store.handleStationChange((previous) => ({ ...previous, laneLabels: ["4", ""] }));
      const overlay = store.overlay.value;
      expect(overlay.kind === "station-settings" && overlay.draft.laneLabels).toEqual(["4", ""]);
      expect(store.data.value.station.laneLabels).toEqual(["4"]);
    });

    it("does nothing while the settings sheet is closed", () => {
      const before = store.data.value;
      store.handleStationChange((previous) => ({ ...previous, name: "x" }));
      expect(store.data.value).toBe(before);
    });
  });

  describe("photo draft handlers", () => {
    it("keeps a photo it cannot strip and flags its metadata until removed", async () => {
      // jsdom has no OffscreenCanvas, so stripping always fails here.
      store.openOverlay({ kind: "edit-location" });
      const file = new File(["x"], "spot.jpg", { type: "image/jpeg" });

      await store.handlePhotoChange({
        currentTarget: { files: [file], value: "" },
      } as unknown as TargetedEvent<HTMLInputElement>);
      expect(editorOf(store).draft.photoFile).toBe(file);
      expect(editorOf(store).photoMetadataKept).toBe(true);

      store.handlePhotoRemove();
      expect(editorOf(store).draft.photoFile).toBeNull();
      expect(editorOf(store).photoMetadataKept).toBe(false);
    });

    it("drops a photo picked in an editor that was closed meanwhile", async () => {
      store.openOverlay({ kind: "edit-location" });
      const file = new File(["x"], "spot.jpg", { type: "image/jpeg" });

      const pending = store.handlePhotoChange({
        currentTarget: { files: [file], value: "" },
      } as unknown as TargetedEvent<HTMLInputElement>);
      store.closeOverlay();
      store.openOverlay({ kind: "edit-location" });
      await pending;

      expect(editorOf(store).draft.photoFile).toBeNull();
      expect(editorOf(store).photoMetadataKept).toBe(false);
    });

    it("ignores photo change and remove without an open editor", async () => {
      await store.handlePhotoChange({
        currentTarget: { files: [], value: "" },
      } as unknown as TargetedEvent<HTMLInputElement>);
      store.handlePhotoRemove();
      expect(store.overlay.value).toEqual({ kind: "closed" });
    });
  });

  describe("handleLocationSubmit", () => {
    async function saveOutsideSpot(notes: string) {
      store.openOverlay({ kind: "edit-location" });
      store.setLocationDraft({ ...createOutsideLocationDraft(), notes });
      await store.handleLocationSubmit(submitEvent());
    }

    it("asks once for persistent storage after a save, ignoring a refusal", async () => {
      const persist = vi.fn().mockRejectedValue(new Error("refused"));
      vi.stubGlobal("navigator", { storage: { persist } });

      await saveOutsideSpot("by the tree");
      await saveOutsideSpot("by the lamp post");

      expect(store.data.value.current).toMatchObject({ notes: "by the lamp post" });
      expect(persist).toHaveBeenCalledTimes(1);
    });

    it("keeps the editor open with an error when there is nothing to find the bike by", async () => {
      store.openOverlay({ kind: "edit-location" });

      await store.handleLocationSubmit(submitEvent());

      expect(editorOf(store).error).toBe(t.value.errorLaneRequired);
      expect(store.data.value.current).toBeNull();
    });

    it("clears the error once the spot is savable", async () => {
      store.openOverlay({ kind: "edit-location" });
      await store.handleLocationSubmit(submitEvent());

      store.setLocationDraft((draft) => ({ ...draft, lane: "7" }));
      await store.handleLocationSubmit(submitEvent());

      expect(store.overlay.value).toEqual({ kind: "closed" });
      expect(store.data.value.current).toMatchObject({ lane: "7" });
    });
  });

  describe("persistence", () => {
    it("lets a failed save replace the success notice", async () => {
      const failing = createStore({
        ...browserRepository,
        saveAppData: () => {
          throw new Error("quota exceeded");
        },
      });
      const stop = failing.start();
      failing.notice.value = null;

      const file = new File([exportSpots(sampleAppData)], "spots.json");
      await failing.handleImportSpots({
        currentTarget: { files: [file], value: "" },
      } as unknown as TargetedEvent<HTMLInputElement>);

      expect(failing.data.value.recent).toHaveLength(2);

      expect(failing.notice.value).toEqual({ text: t.value.noticeSaveFailed, tone: "error" });
      stop();
    });

    it("keeps the photos of records a failed save left on disk", async () => {
      vi.stubGlobal("confirm", () => true);
      const dropUnusedPhotos = vi.fn(() => Promise.resolve());
      const clearPhotos = vi.fn(() => Promise.resolve());
      const withPhoto = { ...sampleAppData.recent[0], photoId: "photo-1" };
      const saveAppData = vi.fn();
      const failing = createStore({
        ...browserRepository,
        loadAppData: () => ({ data: { ...sampleAppData, recent: [withPhoto] }, lost: null }),
        saveAppData,
        reconcilePhotos: () => Promise.resolve(null),
        dropUnusedPhotos,
        clearPhotos,
      });
      const stop = failing.start();
      saveAppData.mockImplementation(() => {
        throw new Error("quota exceeded");
      });

      await failing.handleRemoveRecent(withPhoto.id);
      await failing.handleClearAllData();

      expect(dropUnusedPhotos).not.toHaveBeenCalled();
      expect(clearPhotos).not.toHaveBeenCalled();
      stop();
    });
  });

  describe("handleRemoveRecent", () => {
    const withPhoto = { ...sampleAppData.recent[0], photoId: "photo-1" };
    const other = { ...sampleAppData.recent[0], id: "other", photoId: "photo-2" };
    let dropUnusedPhotos: Mock<SpotRepository["dropUnusedPhotos"]>;
    let stop: () => void;

    beforeEach(() => {
      vi.useFakeTimers();
      dropUnusedPhotos = vi.fn<SpotRepository["dropUnusedPhotos"]>(() => Promise.resolve());
      store = createStore({
        ...browserRepository,
        loadAppData: () => ({ data: { ...sampleAppData, recent: [other, withPhoto] }, lost: null }),
        reconcilePhotos: () => Promise.resolve(null),
        dropUnusedPhotos,
      });
      stop = store.start();
      store.openOverlay({ kind: "recent-preview", id: withPhoto.id });
    });

    afterEach(() => {
      stop();
      vi.useRealTimers();
    });

    it("keeps the photo until the undo window ends, then drops it", () => {
      store.handleRemoveRecent(withPhoto.id);

      expect(store.data.value.recent).toEqual([other]);
      expect(store.notice.value?.text).toBe(t.value.noticeRecentRemoved);
      expect(store.notice.value?.undo).toBeTypeOf("function");
      expect(dropUnusedPhotos).not.toHaveBeenCalled();

      vi.advanceTimersByTime(UNDO_WINDOW_MS);

      expect(dropUnusedPhotos).toHaveBeenCalledTimes(1);
      const [previous, next] = dropUnusedPhotos.mock.calls[0];
      expect(previous.recent).toEqual([withPhoto]);
      expect(next).toBe(store.data.value);
      expect(store.notice.value).toBeNull();
    });

    it("puts the spot back in its place, photo and all, on undo", () => {
      store.handleRemoveRecent(withPhoto.id);
      store.notice.value?.undo?.();

      expect(store.data.value.recent).toEqual([other, withPhoto]);
      expect(store.notice.value).toEqual({ text: t.value.noticeRecentRestored });
      vi.advanceTimersByTime(UNDO_WINDOW_MS);
      expect(dropUnusedPhotos).not.toHaveBeenCalled();
    });

    it("ends the first undo window when a second spot is removed", () => {
      store.handleRemoveRecent(withPhoto.id);
      const firstUndo = store.notice.value?.undo;
      store.handleRemoveRecent(other.id);

      expect(dropUnusedPhotos).toHaveBeenCalledTimes(1);
      firstUndo?.();
      expect(store.data.value.recent).toEqual([]);

      store.notice.value?.undo?.();
      expect(store.data.value.recent).toEqual([other]);
    });
  });

  describe("handleImportSpots", () => {
    it("drops the photos of spots the import pushes out of Recent", async () => {
      const dropUnusedPhotos = vi.fn(() => Promise.resolve());
      const old = Array.from({ length: RECENT_LIMIT }, (_, index) => ({
        ...sampleAppData.recent[0],
        id: `old-${index}`,
        photoId: `photo-${index}`,
        updatedAt: `2026-01-0${index + 1}T08:00:00.000Z`,
      }));
      const importing = createStore({
        ...browserRepository,
        loadAppData: () => ({ data: { ...sampleAppData, recent: old }, lost: null }),
        reconcilePhotos: () => Promise.resolve(null),
        dropUnusedPhotos,
      });
      const stop = importing.start();
      const fresh = { ...sampleAppData.recent[0], id: "fresh" };
      const file = new File([JSON.stringify({ version: 1, spots: [fresh] })], "spots.json");

      await importing.handleImportSpots({
        currentTarget: { files: [file], value: "" },
      } as unknown as TargetedEvent<HTMLInputElement>);

      expect(importing.data.value.recent.map((entry) => entry.id)).not.toContain("old-0");
      expect(dropUnusedPhotos).toHaveBeenCalledWith(
        expect.objectContaining({ recent: old }),
        importing.data.value,
      );
      stop();
    });
  });

  describe("toggleEditorDetails", () => {
    it("flips the details flag", () => {
      store.openOverlay({ kind: "edit-location" }); // a fresh opening starts collapsed
      store.toggleEditorDetails();
      expect(editorOf(store).showDetails).toBe(true);
      store.toggleEditorDetails();
      expect(editorOf(store).showDetails).toBe(false);
    });
  });

  describe("setLocationDraft", () => {
    it("ignores updates while the editor is closed", () => {
      store.setLocationDraft((draft) => ({ ...draft, notes: "changed" }));
      expect(store.overlay.value).toEqual({ kind: "closed" });
    });
  });
});
