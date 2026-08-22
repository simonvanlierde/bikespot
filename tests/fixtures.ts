import type { AppData } from "../src/lib/app-data.ts";
import { defaultStationConfig } from "../src/lib/defaults.ts";
import { createLocationRecord } from "../src/lib/domain.ts";
import { APP_DATA_STORAGE_KEY } from "../src/lib/repository.ts";

// A returning user's data: one current spot (lane 4) and one earlier spot.
export const sampleAppData: AppData = {
  station: { ...defaultStationConfig, name: "My station" },
  current: createLocationRecord(
    {
      mode: "station",
      stationName: "My station",
      lane: "4",
      side: "right",
      rackLevel: "bottom",
      distance: "middle",
      floor: "1",
      notes: "Next to the blue pillar",
      visibleFields: { side: true, rackLevel: true, distance: true },
    },
    "2026-04-19T08:00:00.000Z",
  ),
  recent: [
    createLocationRecord(
      {
        mode: "station",
        stationName: "My station",
        lane: "5",
        side: "left",
        rackLevel: "top",
        distance: "close",
        floor: "1",
        visibleFields: { side: true, rackLevel: true, distance: true },
      },
      "2026-04-18T18:20:00.000Z",
    ),
  ],
};

export function seedStorage(data: AppData = sampleAppData): void {
  window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data));
}
