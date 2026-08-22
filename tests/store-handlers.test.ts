import type { TargetedEvent } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  closeOverlay,
  data,
  geoStatus,
  handleCaptureLocation,
  handlePhotoChange,
  handlePhotoRemove,
  handleStationChange,
  locationDraft,
  notice,
  openOverlay,
  setLocationDraft,
  showEditorDetails,
  stationDraft,
  toggleEditorDetails,
} from "../src/lib/store.ts";

function stubGeolocation(impl: Parameters<typeof vi.fn>[0]) {
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: vi.fn(impl) } });
}

describe("store handlers", () => {
  beforeEach(() => {
    closeOverlay();
    notice.value = null;
    geoStatus.value = "idle";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("handleCaptureLocation", () => {
    it("does nothing without an open location draft", async () => {
      await handleCaptureLocation();
      expect(geoStatus.value).toBe("idle");
    });

    it("stores captured coords on the draft and clears the capturing state", async () => {
      openOverlay({ kind: "edit-location" });
      stubGeolocation((success: PositionCallback) => {
        success({
          coords: { latitude: 52.1, longitude: 4.2, accuracy: 8 },
        } as GeolocationPosition);
      });

      await handleCaptureLocation();

      expect(geoStatus.value).toBe("idle");
      expect(locationDraft.value?.coords).toEqual({ lat: 52.1, lng: 4.2, accuracy: 8 });
    });

    it("drops a fix that resolves after the editor was closed and reopened", async () => {
      openOverlay({ kind: "edit-location" });
      let resolveFix: PositionCallback = () => undefined;
      stubGeolocation((success: PositionCallback) => {
        resolveFix = success;
      });

      const pending = handleCaptureLocation();
      closeOverlay();
      openOverlay({ kind: "edit-location" });
      resolveFix({ coords: { latitude: 1, longitude: 2, accuracy: 3 } } as GeolocationPosition);
      await pending;

      expect(locationDraft.value?.coords).toBeNull();
      expect(geoStatus.value).toBe("idle");
    });

    it("flags an error when geolocation is unavailable", async () => {
      openOverlay({ kind: "edit-location" });
      vi.stubGlobal("navigator", {});

      await handleCaptureLocation();

      expect(geoStatus.value).toBe("error");
    });

    it("flags an error when the lookup rejects", async () => {
      openOverlay({ kind: "edit-location" });
      stubGeolocation((_s: PositionCallback, error?: PositionErrorCallback) => {
        error?.({ code: 1, message: "denied" } as GeolocationPositionError);
      });

      await handleCaptureLocation();

      expect(geoStatus.value).toBe("error");
    });
  });

  describe("handleStationChange", () => {
    it("applies every station change immediately, keeping the draft as typed", () => {
      openOverlay({ kind: "station-settings" });

      handleStationChange((previous) => ({ ...previous, name: "Amsterdam Zuid" }));
      expect(data.value.station.name).toBe("Amsterdam Zuid");

      // A half-typed blank preset stays in the draft but is dropped from config.
      handleStationChange((previous) => ({ ...previous, laneLabels: ["4", ""] }));
      expect(stationDraft.value?.laneLabels).toEqual(["4", ""]);
      expect(data.value.station.laneLabels).toEqual(["4"]);
    });

    it("does nothing without a station draft", () => {
      closeOverlay(); // stationDraft is null
      const before = data.value;
      handleStationChange((previous) => ({ ...previous, name: "x" }));
      expect(data.value).toBe(before);
    });
  });

  describe("photo draft handlers", () => {
    it("sets and clears the pending photo file on the draft", async () => {
      openOverlay({ kind: "edit-location" });
      const file = new File(["x"], "spot.jpg", { type: "image/jpeg" });

      await handlePhotoChange({
        currentTarget: { files: [file], value: "" },
      } as unknown as TargetedEvent<HTMLInputElement>);
      expect(locationDraft.value?.photoFile).toBe(file);

      handlePhotoRemove();
      expect(locationDraft.value?.photoFile).toBeNull();
    });

    it("ignores photo change and remove without a location draft", () => {
      closeOverlay(); // locationDraft is null
      handlePhotoChange({
        currentTarget: { files: [], value: "" },
      } as unknown as TargetedEvent<HTMLInputElement>);
      handlePhotoRemove();
      expect(locationDraft.value).toBeNull();
    });
  });

  describe("toggleEditorDetails", () => {
    it("flips the details flag", () => {
      openOverlay({ kind: "edit-location" }); // resets the flag to false
      toggleEditorDetails();
      expect(showEditorDetails.value).toBe(true);
      toggleEditorDetails();
      expect(showEditorDetails.value).toBe(false);
    });
  });

  describe("signal setters", () => {
    it("ignores updates when the target draft is null", () => {
      closeOverlay(); // locationDraft is null
      setLocationDraft((draft) => ({ ...draft, notes: "changed" }));
      expect(locationDraft.value).toBeNull();
    });
  });
});
