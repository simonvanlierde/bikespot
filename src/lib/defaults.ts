import type { AppData, StationConfig } from "./app-data";

export const defaultStationConfig: StationConfig = {
  name: "",
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

// First run is honest: no bike parked, nothing in history. The card's empty
// state explains the app instead of a fabricated starter spot.
export const defaultAppData: AppData = {
  station: defaultStationConfig,
  current: null,
  recent: [],
};
