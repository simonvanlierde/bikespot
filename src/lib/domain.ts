import type {
  AppData,
  EnabledFields,
  LocationRecord,
  LocationRecordInput,
  StationConfig,
  VisibleFields,
} from './app-data';
import { ENABLED_FIELD_KEYS, RECENT_LIMIT, VISIBLE_FIELD_KEYS } from './app-data';
import { defaultStationConfig } from './defaults';
import { createId } from './id';

type StationLocationRecordSeed = Omit<
  Extract<LocationRecord, { mode: 'station' }>,
  'id' | 'updatedAt'
>;
type OutsideLocationRecordSeed = Omit<
  Extract<LocationRecord, { mode: 'outside' }>,
  'id' | 'updatedAt'
>;
type LocationRecordSeed = StationLocationRecordSeed | OutsideLocationRecordSeed;

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
  const labels = Array.isArray(value?.laneLabels)
    ? value.laneLabels
        .map((label) => String(label).trim())
        .filter(Boolean)
        .slice(0, 5)
    : fallback.laneLabels;

  const enabledFields = {} as EnabledFields;

  for (const key of ENABLED_FIELD_KEYS) {
    enabledFields[key] = value?.enabledFields?.[key] ?? fallback.enabledFields[key];
  }

  return {
    name: value?.name?.trim() || fallback.name,
    laneInputMode: value?.laneInputMode === 'number' ? 'number' : 'quick',
    laneLabels: labels.length > 0 ? labels : fallback.laneLabels,
    enabledFields,
    defaultFloor: value?.defaultFloor?.trim() || fallback.defaultFloor,
  };
}

function buildRecord(
  station: StationConfig,
  input: LocationRecordInput,
  timestamp: string,
): LocationRecord {
  if (input.mode === 'outside') {
    return createLocationRecord(
      {
        mode: 'outside',
        stationName: station.name,
        outsideDescription: input.outsideDescription.trim(),
        photoId: input.photoId,
      },
      timestamp,
    );
  }

  return createLocationRecord(
    {
      mode: 'station',
      stationName: station.name,
      lane: input.lane.trim(),
      side: input.side,
      rackLevel: input.rackLevel,
      distance: input.distance,
      floor: input.floor,
      rackNumber: input.rackNumber,
      notes: input.notes,
      photoId: input.photoId,
      visibleFields: buildVisibleFields(station.enabledFields),
    },
    timestamp,
  );
}

function capRecent(entries: LocationRecord[]): LocationRecord[] {
  return entries.slice(0, RECENT_LIMIT);
}
