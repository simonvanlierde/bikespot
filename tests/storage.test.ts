import { beforeEach, describe, expect, it } from "vitest";
import type { AppData } from "../src/lib/app-data.ts";
import { defaultAppData, defaultStationConfig } from "../src/lib/defaults.ts";
import {
  createLocationRecord,
  promoteRecentLocation,
  saveLocation,
  updateStationConfig,
} from "../src/lib/domain.ts";
import { buildLocationRecordInput } from "../src/lib/drafts.ts";
import { clearPhotoBlobs } from "../src/lib/photos.ts";
import { APP_DATA_STORAGE_KEY, loadAppData } from "../src/lib/repository.ts";

describe("location storage", () => {
  const defaultState: AppData = defaultAppData;

  beforeEach(async () => {
    window.localStorage.clear();
    await clearPhotoBlobs();
  });

  it("saves a new current spot and moves the previous one into recent history", () => {
    const previous = createLocationRecord(
      {
        mode: "station",
        lane: "5",
        side: "right",
        rackLevel: "bottom",
        distance: "middle",
        stationName: "My station",
        visibleFields: {
          side: true,
          rackLevel: true,
          distance: true,
        },
      },
      "2026-04-18T08:15:00.000Z",
    );

    const nextState = saveLocation(
      {
        ...defaultState,
        current: previous,
        recent: [],
      },
      {
        mode: "station",
        lane: "4",
        side: "left",
        rackLevel: "top",
        distance: "close",
        notes: "Near the repair station",
      },
      "2026-04-19T07:05:00.000Z",
    );

    expect(nextState.current).toMatchObject({
      mode: "station",
      lane: "4",
      stationName: "My station",
      side: "left",
      rackLevel: "top",
      distance: "close",
      notes: "Near the repair station",
      visibleFields: {},
    });
    expect(nextState.current?.updatedAt).toBe("2026-04-19T07:05:00.000Z");
    expect(nextState.recent).toHaveLength(1);
    expect(nextState.recent[0]).toMatchObject({
      lane: "5",
      stationName: "My station",
      side: "right",
      rackLevel: "bottom",
      distance: "middle",
    });
  });

  it("promotes a recent location to current and keeps recent history capped", () => {
    const current = createLocationRecord(
      {
        mode: "station",
        lane: "4",
        side: "left",
        rackLevel: "bottom",
        distance: "far",
        stationName: "My station",
        visibleFields: {
          side: true,
          rackLevel: true,
          distance: true,
        },
      },
      "2026-04-19T06:30:00.000Z",
    );

    const recent = [
      createLocationRecord(
        {
          mode: "station",
          lane: "5",
          side: "right",
          rackLevel: "top",
          distance: "close",
          stationName: "My station",
          visibleFields: {
            side: true,
            rackLevel: true,
            distance: true,
          },
        },
        "2026-04-18T09:00:00.000Z",
      ),
      createLocationRecord(
        {
          mode: "station",
          lane: "6",
          side: "left",
          rackLevel: "bottom",
          distance: "middle",
          stationName: "My station",
          visibleFields: {
            side: true,
            rackLevel: true,
            distance: true,
          },
        },
        "2026-04-17T09:00:00.000Z",
      ),
      createLocationRecord(
        {
          mode: "outside",
          outsideDescription: "At the cafe rack",
          stationName: "My station",
        },
        "2026-04-16T09:00:00.000Z",
      ),
      createLocationRecord(
        {
          mode: "station",
          lane: "P1",
          side: "left",
          rackLevel: "top",
          distance: "close",
          stationName: "My station",
          visibleFields: {
            side: true,
            rackLevel: true,
            distance: true,
          },
        },
        "2026-04-15T09:00:00.000Z",
      ),
      createLocationRecord(
        {
          mode: "station",
          lane: "Bike shed",
          side: "right",
          rackLevel: "bottom",
          distance: "middle",
          stationName: "My station",
          visibleFields: {
            side: true,
            rackLevel: true,
            distance: true,
          },
        },
        "2026-04-14T09:00:00.000Z",
      ),
    ];

    const nextState = promoteRecentLocation(
      {
        ...defaultState,
        current,
        recent,
      },
      recent[1].id,
      "2026-04-19T07:10:00.000Z",
    );

    expect(nextState.current).toMatchObject({
      mode: "station",
      lane: "6",
      side: "left",
      rackLevel: "bottom",
      distance: "middle",
    });
    expect(nextState.current?.updatedAt).toBe("2026-04-19T07:10:00.000Z");
    expect(nextState.recent).toHaveLength(5);
    expect(nextState.recent[0]).toMatchObject({
      lane: "4",
      side: "left",
      rackLevel: "bottom",
      distance: "far",
    });
  });

  it("stores station configuration separately from location entries", () => {
    const nextState = updateStationConfig(defaultState, {
      name: "Amsterdam Zuid",
      laneInputMode: "quick",
      laneLabels: ["4", "5", "6"],
      floorInputMode: "number",
      floorLabels: ["1", "2", "3"],
      enabledFields: {
        lane: true,
        side: false,
        rackLevel: false,
        distance: false,
        floor: false,
        rackNumber: false,
      },
    });

    expect(nextState.station).toMatchObject({
      name: "Amsterdam Zuid",
      laneInputMode: "quick",
      laneLabels: ["4", "5", "6"],
    });
    expect(nextState.station.enabledFields).toMatchObject({
      lane: true,
      side: false,
      rackLevel: false,
    });
  });

  it("keeps the original station name on recent entries after station settings change", () => {
    const previous = createLocationRecord(
      {
        mode: "station",
        lane: "5",
        side: "right",
        rackLevel: "bottom",
        distance: "middle",
        stationName: "Old station",
        visibleFields: {
          side: true,
          rackLevel: true,
          distance: true,
        },
      },
      "2026-04-18T08:15:00.000Z",
    );

    const nextState = saveLocation(
      {
        ...defaultState,
        station: {
          ...defaultState.station,
          name: "Old station",
        },
        current: previous,
        recent: [],
      },
      {
        mode: "station",
        lane: "4",
        side: "left",
        rackLevel: "top",
        distance: "close",
      },
      "2026-04-19T07:05:00.000Z",
    );

    const renamedState = updateStationConfig(nextState, {
      ...nextState.station,
      name: "New station",
    });

    expect(renamedState.recent[0]).toMatchObject({
      lane: "5",
      stationName: "Old station",
    });
    expect(renamedState.current).toMatchObject({
      lane: "4",
      stationName: "Old station",
    });
  });

  it("keeps the original enabled fields on saved entries after station settings change", () => {
    const nextState = saveLocation(
      {
        ...defaultState,
        station: {
          ...defaultState.station,
          enabledFields: {
            lane: true,
            side: true,
            rackLevel: false,
            distance: false,
            floor: false,
            rackNumber: false,
          },
        },
        recent: [],
      },
      {
        mode: "station",
        lane: "4",
        side: "left",
      },
      "2026-04-19T07:05:00.000Z",
    );

    const renamedState = updateStationConfig(nextState, {
      ...nextState.station,
      enabledFields: {
        lane: true,
        side: false,
        rackLevel: false,
        distance: false,
        floor: true,
        rackNumber: false,
      },
    });

    expect(renamedState.current).toMatchObject({
      side: "left",
      visibleFields: {
        side: true,
      },
    });
  });

  it("supports outside parking entries without station-specific fields", () => {
    const entry = createLocationRecord(
      {
        mode: "outside",
        outsideDescription: "Locked to the signpost near the tram stop",
        stationName: "My station",
      },
      "2026-04-19T08:00:00.000Z",
    );

    expect(entry).toMatchObject({
      mode: "outside",
      outsideDescription: "Locked to the signpost near the tram stop",
    });
    if (entry.mode === "outside") {
      expect(entry.photoId).toBeUndefined();
    }
  });

  it("carries draft coordinates through to the saved record", () => {
    const input = buildLocationRecordInput(
      {
        kind: "station",
        lane: "4",
        side: "right",
        rackLevel: "bottom",
        distance: "middle",
        floor: "",
        rackNumber: "",
        notes: "",
        photoFile: null,
        coords: { lat: 52.379189, lng: 4.899431, accuracy: 12 },
      },
      defaultStationConfig,
    );

    expect(input).toMatchObject({ coords: { lat: 52.379189, lng: 4.899431, accuracy: 12 } });

    const nextState = saveLocation(
      { ...defaultState, recent: [] },
      input ?? { mode: "station", lane: "4" },
      "2026-04-19T07:05:00.000Z",
    );

    expect(nextState.current?.coords).toEqual({ lat: 52.379189, lng: 4.899431, accuracy: 12 });
  });

  it("keeps an outside entry saved with only a photo or GPS, no description", async () => {
    window.localStorage.setItem(
      APP_DATA_STORAGE_KEY,
      JSON.stringify({
        station: defaultState.station,
        current: {
          id: "outside-evidence",
          updatedAt: "2026-04-19T08:00:00.000Z",
          mode: "outside",
          stationName: "My station",
          coords: { lat: 52.08, lng: 4.32 },
        },
        recent: [],
      }),
    );

    const loaded = await loadAppData();

    expect(loaded.current).toMatchObject({
      mode: "outside",
      outsideDescription: undefined,
      coords: { lat: 52.08, lng: 4.32 },
    });
  });

  it("resets malformed persisted state back to the default state", async () => {
    window.localStorage.setItem(
      APP_DATA_STORAGE_KEY,
      JSON.stringify({
        current: {
          mode: "station",
        },
      }),
    );

    await expect(loadAppData()).resolves.toEqual(defaultState);
  });

  it("rejects the old storage shape and starts fresh", async () => {
    window.localStorage.setItem(
      "bikespot-state",
      JSON.stringify({
        station: defaultState.station,
        current: {
          mode: "outside",
          outsideNote: "Legacy location",
        },
        recent: [],
      }),
    );

    await expect(loadAppData()).resolves.toEqual(defaultState);
  });
});
