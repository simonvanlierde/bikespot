import type { AppData, LocationRecord, StationConfig } from "./app-data";
import { createLocationRecord } from "./domain";

export const defaultStationConfig: StationConfig = {
  name: "My station",
  laneInputMode: "number",
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
};

const starterCurrent: LocationRecord = createLocationRecord(
  {
    mode: "station",
    stationName: defaultStationConfig.name,
    lane: "4",
    side: "right",
    rackLevel: "bottom",
    distance: "middle",
    floor: "1",
    notes: "Starter spot - update this to your real location.",
    visibleFields: {
      side: true,
      rackLevel: true,
      distance: true,
    },
  },
  "2026-04-19T08:00:00.000Z",
);

export const defaultAppData: AppData = {
  station: defaultStationConfig,
  current: starterCurrent,
  recent: [
    createLocationRecord(
      {
        mode: "station",
        stationName: defaultStationConfig.name,
        lane: "5",
        side: "left",
        rackLevel: "top",
        distance: "close",
        floor: "1",
        visibleFields: {
          side: true,
          rackLevel: true,
          distance: true,
        },
      },
      "2026-04-18T18:20:00.000Z",
    ),
  ],
};
