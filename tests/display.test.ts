import { describe, expect, it } from "vitest";

import type { LocationRecord } from "../src/lib/app-data";
import {
  formatAccuracy,
  formatTimestamp,
  getDetailFacts,
  getPrimaryLabel,
  getSummary,
  mapsLink,
  showFloor,
  titleCase,
} from "../src/features/location/display";

function station(overrides: Partial<LocationRecord> = {}): LocationRecord {
  return {
    id: "r1",
    updatedAt: "2026-04-19T07:05:00.000Z",
    stationName: "My station",
    mode: "station",
    visibleFields: { side: true, rackLevel: true, distance: true, floor: true, rackNumber: true },
    ...overrides,
  } as LocationRecord;
}

describe("coordinate display helpers", () => {
  it("builds a universal Google Maps search URL", () => {
    expect(mapsLink({ lat: 52.379189, lng: 4.899431 })).toBe(
      "https://www.google.com/maps/search/?api=1&query=52.379189,4.899431",
    );
  });

  it("formats accuracy when present and omits it otherwise", () => {
    expect(formatAccuracy({ lat: 0, lng: 0, accuracy: 12 })).toBe("±12m");
    expect(formatAccuracy({ lat: 0, lng: 0 })).toBe("");
  });
});

describe("titleCase", () => {
  it("capitalises the first letter and falls back to a dash when empty", () => {
    expect(titleCase("left")).toBe("Left");
    expect(titleCase()).toBe("-");
    expect(titleCase("")).toBe("-");
  });
});

describe("formatTimestamp", () => {
  it("returns a placeholder for missing or invalid dates", () => {
    expect(formatTimestamp()).toBe("not saved yet");
    expect(formatTimestamp("not-a-date")).toBe("not saved yet");
  });

  it("formats a valid ISO timestamp", () => {
    expect(formatTimestamp("2026-04-19T07:05:00.000Z")).toMatch(/2026/);
  });
});

describe("showFloor", () => {
  it("is true only when floor is enabled and set", () => {
    expect(showFloor(station({ floor: "2" }))).toBe(true);
    expect(showFloor(station({ floor: "" }))).toBe(false);
    expect(showFloor(station({ mode: "outside" } as Partial<LocationRecord>))).toBe(false);
  });
});

describe("getSummary", () => {
  it("returns empty for no entry", () => {
    expect(getSummary(null)).toBe("");
  });

  it("uses the outside description for outside entries", () => {
    expect(
      getSummary({
        id: "o1",
        updatedAt: "2026-04-19T07:05:00.000Z",
        stationName: "My station",
        mode: "outside",
        outsideDescription: "By the tram stop",
      }),
    ).toBe("By the tram stop");
  });

  it("joins visible station facts with a middot", () => {
    expect(getSummary(station({ side: "left", rackLevel: "top", distance: "close" }))).toBe(
      "Left · Top · Close",
    );
  });

  it("omits fields whose visibility flag is off", () => {
    expect(
      getSummary(
        station({
          side: "left",
          rackLevel: "top",
          visibleFields: { side: true },
        }),
      ),
    ).toBe("Left");
  });
});

describe("getPrimaryLabel", () => {
  it("is empty for no entry", () => {
    expect(getPrimaryLabel(null)).toBe("");
  });

  it("labels outside entries", () => {
    expect(
      getPrimaryLabel({
        id: "o1",
        updatedAt: "2026-04-19T07:05:00.000Z",
        stationName: "My station",
        mode: "outside",
      }),
    ).toBe("Outside the station");
  });

  it("prefers rack number over lane", () => {
    expect(getPrimaryLabel(station({ rackNumber: "12", lane: "4" }))).toBe("Rack 12");
  });

  it("falls back to lane, then a generic label", () => {
    expect(getPrimaryLabel(station({ lane: "4" }))).toBe("Lane 4");
    expect(getPrimaryLabel(station())).toBe("Bike spot");
  });
});

describe("getDetailFacts", () => {
  it("is empty for outside entries", () => {
    expect(
      getDetailFacts({
        id: "o1",
        updatedAt: "2026-04-19T07:05:00.000Z",
        stationName: "My station",
        mode: "outside",
      }),
    ).toEqual([]);
  });

  it("lists supporting facts and skips the field used as the headline", () => {
    // rackNumber becomes the headline, so it's excluded; lane stays as a fact.
    expect(
      getDetailFacts(
        station({
          rackNumber: "12",
          lane: "4",
          floor: "2",
          distance: "close",
          side: "left",
          rackLevel: "top",
        }),
      ),
    ).toEqual(["Station floor 2", "Lane 4", "Close distance", "Left side", "Top rack"]);
  });

  it("skips lane when it is the headline field", () => {
    expect(getDetailFacts(station({ lane: "4", side: "left" }))).toEqual(["Left side"]);
  });
});
