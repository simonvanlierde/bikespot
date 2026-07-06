import { describe, expect, it } from "vitest";

import { defaultAppData } from "../src/lib/defaults.ts";
import {
  createId,
  createLocationRecord,
  promoteRecentLocation,
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
