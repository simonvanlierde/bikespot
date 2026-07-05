import { describe, expect, it } from "vitest";

import { defaultStationConfig } from "../src/lib/defaults";
import { createLocationRecord } from "../src/lib/domain";
import { buildLocationRecordInput, createLocationDraft } from "../src/lib/drafts";

// "Change location" always records a new parking event, so the draft keeps
// structural habits (lane, side, floor, ...) but never the previous spot's
// evidence: notes, photo, GPS coords, and rack number describe the old spot.
describe("createLocationDraft", () => {
  it("keeps structural station fields but drops spot-specific evidence", () => {
    const current = createLocationRecord({
      mode: "station",
      stationName: "My station",
      lane: "7",
      side: "left",
      rackLevel: "top",
      distance: "far",
      floor: "2",
      rackNumber: "137",
      notes: "Next to the blue pillar",
      photoId: "photo-1",
      coords: { lat: 52.08, lng: 4.32 },
      visibleFields: {},
    });

    const draft = createLocationDraft(current, defaultStationConfig);

    expect(draft).toMatchObject({
      kind: "station",
      lane: "7",
      side: "left",
      rackLevel: "top",
      distance: "far",
      floor: "2",
      rackNumber: "",
      notes: "",
      photoFile: null,
      coords: null,
    });
  });

  it("starts an outside draft without the previous description, photo, or coords", () => {
    const current = createLocationRecord({
      mode: "outside",
      stationName: "My station",
      outsideDescription: "At the fence near the exit",
      photoId: "photo-2",
      coords: { lat: 52.08, lng: 4.32 },
    });

    const draft = createLocationDraft(current, defaultStationConfig);

    expect(draft).toEqual({
      kind: "outside",
      notes: "",
      photoFile: null,
      coords: null,
    });
  });
});

// An outside spot is savable as long as it carries something to find it by.
describe("buildLocationRecordInput (outside)", () => {
  const base = { kind: "outside", notes: "", photoFile: null, coords: null } as const;

  it("rejects an outside spot with no note, photo, or GPS", () => {
    expect(buildLocationRecordInput(base, defaultStationConfig)).toBeNull();
  });

  it("saves an outside spot carrying only a photo or GPS", () => {
    const photoFile = new File(["x"], "spot.jpg", { type: "image/jpeg" });

    expect(buildLocationRecordInput({ ...base, photoFile }, defaultStationConfig)).toMatchObject({
      mode: "outside",
      outsideDescription: undefined,
    });
    expect(
      buildLocationRecordInput({ ...base, coords: { lat: 1, lng: 2 } }, defaultStationConfig),
    ).toMatchObject({ mode: "outside", coords: { lat: 1, lng: 2 } });
  });
});
