import { describe, expect, it } from "vitest";

import { defaultAppData } from "../src/lib/defaults.ts";
import {
  clearCurrentLocation,
  createId,
  createLocationRecord,
  promoteRecentLocation,
  removeRecentLocation,
  saveLocation,
} from "../src/lib/domain.ts";

describe("createId", () => {
  it("falls back to getRandomValues when randomUUID is unavailable", () => {
    // http-on-LAN (insecure context) has no crypto.randomUUID at all.
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      expect(createId()).toMatch(/^[0-9a-f]{32}$/);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});

describe("saveLocation with no current spot", () => {
  it("sets the first current spot and leaves recent untouched", () => {
    const next = saveLocation(
      { ...defaultAppData, current: null, recent: [] },
      { mode: "station", lane: "4" },
      "2026-04-19T07:05:00.000Z",
    );

    expect(next.current).toMatchObject({ mode: "station", lane: "4" });
    expect(next.recent).toEqual([]);
  });
});

describe("promoteRecentLocation with no current spot", () => {
  it("promotes the selected entry without prepending a current spot to recent", () => {
    const recent = [
      createLocationRecord(
        { mode: "station", stationName: "s", lane: "5", visibleFields: {} },
        "2026-04-18T09:00:00.000Z",
      ),
      createLocationRecord(
        { mode: "station", stationName: "s", lane: "6", visibleFields: {} },
        "2026-04-17T09:00:00.000Z",
      ),
    ];

    const next = promoteRecentLocation(
      { ...defaultAppData, current: null, recent },
      recent[0].id,
      "2026-04-19T07:10:00.000Z",
    );

    expect(next.current).toMatchObject({ lane: "5" });
    expect(next.recent).toEqual([recent[1]]);
  });
});

describe("saveLocation in the same spot", () => {
  const station = {
    ...defaultAppData.station,
    enabledFields: { ...defaultAppData.station.enabledFields, side: true },
  };
  const start = saveLocation(
    { ...defaultAppData, station },
    { mode: "station", lane: "4", side: "left", notes: "pillar" },
    "2026-04-19T07:05:00.000Z",
  );

  it("refreshes the timestamp instead of duplicating the spot into recent", () => {
    const next = saveLocation(
      start,
      { mode: "station", lane: "4", side: "left", notes: "pillar" },
      "2026-04-20T07:05:00.000Z",
    );

    expect(next.recent).toEqual([]);
    expect(next.current).toMatchObject({
      id: start.current?.id,
      updatedAt: "2026-04-20T07:05:00.000Z",
    });
  });

  it("still records a new event when any locator differs", () => {
    const next = saveLocation(start, { mode: "station", lane: "4", side: "right" });

    expect(next.recent).toEqual([start.current]);
  });
});

describe("clearCurrentLocation and removeRecentLocation", () => {
  it("moves the collected spot into recent and can drop it from there", () => {
    const parked = saveLocation({ ...defaultAppData }, { mode: "station", lane: "4" });
    const collected = clearCurrentLocation(parked);

    expect(collected.current).toBeNull();
    expect(collected.recent).toEqual([parked.current]);
    expect(clearCurrentLocation(collected)).toBe(collected);

    const removed = removeRecentLocation(collected, collected.recent[0].id);
    expect(removed.recent).toEqual([]);
  });
});
