import { describe, expect, it } from "vitest";

import { defaultStationConfig } from "../src/lib/defaults.ts";
import { createLocationRecord } from "../src/lib/domain.ts";
import { buildLocationRecordInput, createLocationDraft } from "../src/lib/drafts.ts";

// "Change location" records a new parking event. In a Dutch station the same
// floor is likely but the same spot is not, so only the floor carries over;
// every other locator and all evidence (notes, photo, GPS, rack) start fresh.
describe("createLocationDraft", () => {
  it("carries the floor over but starts every other field fresh", () => {
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

    expect(createLocationDraft(current, defaultStationConfig)).toEqual({
      kind: "station",
      lane: "",
      side: "right",
      rackLevel: "bottom",
      distance: "middle",
      floor: "2",
      rackNumber: "",
      notes: "",
      photoFile: null,
      coords: null,
    });
  });

  it("seeds a fresh draft from the station's first floor label and no lane", () => {
    const draft = createLocationDraft(null, {
      ...defaultStationConfig,
      laneLabels: ["A", "B"],
      floorLabels: ["G", "1"],
    });

    expect(draft).toMatchObject({ kind: "station", lane: "", floor: "G" });
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

describe("buildLocationRecordInput (station)", () => {
  const draft = {
    kind: "station",
    lane: "4",
    side: "left",
    rackLevel: "top",
    distance: "close",
    floor: "2",
    rackNumber: "R9",
    notes: "by the pillar",
    photoFile: null,
    coords: null,
  } as const;

  it("rejects a station spot when lane is enabled but blank", () => {
    const station = {
      ...defaultStationConfig,
      enabledFields: { ...defaultStationConfig.enabledFields, lane: true },
    };
    expect(buildLocationRecordInput({ ...draft, lane: "   " }, station)).toBeNull();
  });

  it("rejects a station spot with every field disabled and nothing else to find it by", () => {
    const off = {
      lane: false,
      side: false,
      rackLevel: false,
      distance: false,
      floor: false,
      rackNumber: false,
    };
    const station = { ...defaultStationConfig, enabledFields: off };
    expect(buildLocationRecordInput({ ...draft, notes: "" }, station)).toBeNull();
    expect(buildLocationRecordInput({ ...draft, notes: "by the pillar" }, station)).not.toBeNull();
  });

  it("keeps only the enabled fields on the built input", () => {
    const station = {
      ...defaultStationConfig,
      enabledFields: {
        lane: true,
        side: true,
        rackLevel: false,
        distance: false,
        floor: false,
        rackNumber: false,
      },
    };

    expect(buildLocationRecordInput(draft, station)).toEqual({
      mode: "station",
      lane: "4",
      side: "left",
      rackLevel: undefined,
      distance: undefined,
      floor: undefined,
      rackNumber: undefined,
      notes: "by the pillar",
      coords: undefined,
    });
  });
});
