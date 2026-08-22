import type {
  AppData,
  EnabledFields,
  FieldInputMode,
  LocationRecord,
  LocationRecordInput,
  StationConfig,
  VisibleFields,
} from "./app-data";
import { ENABLED_FIELD_KEYS, RECENT_LIMIT, VISIBLE_FIELD_KEYS } from "./app-data";
import { defaultStationConfig } from "./defaults";

type StationLocationRecordSeed = Omit<
  Extract<LocationRecord, { mode: "station" }>,
  "id" | "updatedAt"
>;
type OutsideLocationRecordSeed = Omit<
  Extract<LocationRecord, { mode: "outside" }>,
  "id" | "updatedAt"
>;
type LocationRecordSeed = StationLocationRecordSeed | OutsideLocationRecordSeed;

export function createId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // randomUUID needs a secure context; http-on-LAN testing lands here.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function createLocationRecord(
  record: LocationRecordSeed,
  updatedAt: string = new Date().toISOString(),
): LocationRecord {
  return {
    id: createId(),
    updatedAt,
    ...record,
  };
}

export function saveLocation(
  data: AppData,
  input: LocationRecordInput,
  timestamp: string = new Date().toISOString(),
): AppData {
  const nextCurrent = buildRecord(data.station, input, timestamp);

  if (!data.current) {
    return {
      ...data,
      current: nextCurrent,
      recent: data.recent.slice(0, RECENT_LIMIT),
    };
  }

  return {
    ...data,
    current: nextCurrent,
    recent: capRecent([data.current, ...data.recent]),
  };
}

export function promoteRecentLocation(
  data: AppData,
  locationId: string,
  timestamp: string = new Date().toISOString(),
): AppData {
  const selected = data.recent.find((entry) => entry.id === locationId);

  if (!selected) {
    return data;
  }

  const remaining = data.recent.filter((entry) => entry.id !== locationId);

  return {
    ...data,
    current: {
      ...selected,
      updatedAt: timestamp,
    },
    recent: capRecent(data.current ? [data.current, ...remaining] : remaining),
  };
}

export function updateStationConfig(data: AppData, station: StationConfig): AppData {
  return {
    ...data,
    station: normalizeStationConfig(station, defaultStationConfig),
  };
}

export function buildVisibleFields(enabledFields: EnabledFields): VisibleFields {
  const visibleFields: VisibleFields = {};

  for (const key of VISIBLE_FIELD_KEYS) {
    if (enabledFields[key]) {
      visibleFields[key] = true;
    }
  }

  return visibleFields;
}

export function normalizeStationConfig(
  value: Partial<StationConfig> | undefined,
  fallback: StationConfig,
): StationConfig {
  const normalizeLabels = (raw: unknown, fallbackLabels: string[]) => {
    if (!Array.isArray(raw)) {
      return fallbackLabels;
    }
    const labels = raw.map((label) => String(label).trim()).filter(Boolean);
    return labels.length > 0 ? labels : fallbackLabels;
  };

  const enabledFields = {} as EnabledFields;

  for (const key of ENABLED_FIELD_KEYS) {
    const enabled = value?.enabledFields?.[key];
    enabledFields[key] = typeof enabled === "boolean" ? enabled : fallback.enabledFields[key];
  }

  return {
    name: value?.name?.trim() || fallback.name,
    laneInputMode: normalizeMode(value?.laneInputMode, fallback.laneInputMode),
    laneLabels: normalizeLabels(value?.laneLabels, fallback.laneLabels),
    floorInputMode: normalizeMode(value?.floorInputMode, fallback.floorInputMode),
    floorLabels: normalizeLabels(value?.floorLabels, fallback.floorLabels),
    enabledFields,
  };
}

function normalizeMode(value: unknown, fallback: FieldInputMode): FieldInputMode {
  return value === "quick" || value === "number" ? value : fallback;
}

function buildRecord(
  station: StationConfig,
  input: LocationRecordInput,
  timestamp: string,
): LocationRecord {
  if (input.mode === "outside") {
    return createLocationRecord(
      {
        mode: "outside",
        stationName: station.name,
        outsideDescription: input.outsideDescription?.trim(),
        photoId: input.photoId,
        coords: input.coords,
      },
      timestamp,
    );
  }

  return createLocationRecord(
    {
      mode: "station",
      stationName: station.name,
      lane: input.lane?.trim(),
      side: input.side,
      rackLevel: input.rackLevel,
      distance: input.distance,
      floor: input.floor,
      rackNumber: input.rackNumber,
      notes: input.notes,
      photoId: input.photoId,
      coords: input.coords,
      visibleFields: buildVisibleFields(station.enabledFields),
    },
    timestamp,
  );
}

function capRecent(entries: LocationRecord[]): LocationRecord[] {
  return entries.slice(0, RECENT_LIMIT);
}
