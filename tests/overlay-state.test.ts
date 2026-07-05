import { describe, expect, it } from "vitest";

import { defaultAppData } from "../src/lib/defaults";
import { createLocationDraft, createStationSettingsDraft } from "../src/lib/drafts";
import {
  closeOverlay,
  locationDraft,
  openOverlay,
  overlay,
  showEditorDetails,
  stationDraft,
} from "../src/lib/store";

describe("overlay store", () => {
  it("creates the right draft for each overlay and clears unrelated drafts", () => {
    openOverlay({ kind: "edit-location" });

    expect(overlay.value).toEqual({ kind: "edit-location" });
    expect(locationDraft.value).toEqual(
      createLocationDraft(defaultAppData.current, defaultAppData.station),
    );
    expect(stationDraft.value).toBeNull();
    expect(showEditorDetails.value).toBe(false);

    openOverlay({ kind: "station-settings" });

    expect(overlay.value).toEqual({ kind: "station-settings" });
    expect(stationDraft.value).toEqual(createStationSettingsDraft(defaultAppData.station));
    expect(locationDraft.value).toBeNull();

    openOverlay({ kind: "recent-list" });

    expect(locationDraft.value).toBeNull();
    expect(stationDraft.value).toBeNull();

    closeOverlay();

    expect(overlay.value).toEqual({ kind: "closed" });
  });
});
