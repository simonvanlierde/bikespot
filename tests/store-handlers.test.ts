import type { TargetedEvent } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  closeOverlay,
  geoStatus,
  handleCaptureLocation,
  handlePhotoChange,
  handlePhotoRemove,
  handleStationSubmit,
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

  describe("handleStationSubmit", () => {
    it("applies the station draft and posts a notice", () => {
      openOverlay({ kind: "station-settings" });
      const draft = stationDraft.value;
      if (!draft) throw new Error("expected a station draft");
      stationDraft.value = { ...draft, name: "Amsterdam Zuid" };

      handleStationSubmit({ preventDefault() {} } as TargetedEvent<HTMLFormElement>);

      expect(notice.value?.text).toBe("Station settings updated");
      expect(stationDraft.value).toBeNull();
    });
  });

  describe("photo draft handlers", () => {
    it("sets and clears the pending photo file on the draft", () => {
      openOverlay({ kind: "edit-location" });
      const file = new File(["x"], "spot.jpg", { type: "image/jpeg" });

      handlePhotoChange({
        currentTarget: { files: [file], value: "" },
      } as unknown as TargetedEvent<HTMLInputElement>);
      expect(locationDraft.value?.photoFile).toBe(file);

      handlePhotoRemove();
      expect(locationDraft.value?.photoFile).toBeNull();
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
