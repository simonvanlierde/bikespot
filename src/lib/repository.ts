import type {
  AppData,
  Coords,
  Distance,
  LocationRecord,
  RackLevel,
  Side,
  VisibleFields,
} from './app-data';
import { VISIBLE_FIELD_KEYS } from './app-data';
import { defaultAppData, defaultStationConfig } from './defaults';
import { normalizeStationConfig } from './domain';
import { clearPhotoBlobs, loadPhotoBlob, savePhotoBlob } from './photos';

export const APP_DATA_STORAGE_KEY = 'bikespot-app';

export async function loadAppData(): Promise<AppData> {
  if (typeof window === 'undefined') {
    return defaultAppData;
  }

  const raw = window.localStorage.getItem(APP_DATA_STORAGE_KEY);

  if (!raw) {
    return defaultAppData;
  }

  try {
    return normalizeAppData(JSON.parse(raw));
  } catch {
    return defaultAppData;
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data));
}

export async function savePhoto(file: Blob): Promise<string> {
  return savePhotoBlob(file);
}

export async function getPhotoUrl(photoId?: string): Promise<string | null> {
  if (!photoId) {
    return null;
  }

  const blob = await loadPhotoBlob(photoId);

  return blob ? URL.createObjectURL(blob) : null;
}

export async function clearPhotoStore(): Promise<void> {
  await clearPhotoBlobs();
}

function normalizeAppData(value: unknown): AppData {
  if (!value || typeof value !== 'object') {
    return defaultAppData;
  }

  const candidate = value as Partial<AppData>;
  const station = normalizeStationConfig(candidate.station, defaultStationConfig);
  const current = candidate.current ? normalizeLocationRecord(candidate.current) : null;
  const recent = Array.isArray(candidate.recent)
    ? candidate.recent
        .map((entry) => normalizeLocationRecord(entry))
        .filter((entry): entry is LocationRecord => entry !== null)
        .slice(0, 5)
    : null;

  if (!recent) {
    return defaultAppData;
  }

  return {
    station,
    current,
    recent,
  };
}

function normalizeLocationRecord(value: unknown): LocationRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const entry = value as Partial<LocationRecord>;
  const id = typeof entry.id === 'string' ? entry.id : null;
  const updatedAt = typeof entry.updatedAt === 'string' ? entry.updatedAt : null;
  const stationName = typeof entry.stationName === 'string' ? entry.stationName.trim() : '';

  if (!id || !updatedAt || !stationName) {
    return null;
  }

  if (entry.mode === 'outside') {
    const outsideDescription =
      typeof entry.outsideDescription === 'string' ? entry.outsideDescription.trim() : '';

    if (!outsideDescription) {
      return null;
    }

    return {
      id,
      updatedAt,
      mode: 'outside',
      stationName,
      outsideDescription,
      notes: normalizeOptionalString(entry.notes),
      photoId: normalizeOptionalString(entry.photoId),
      coords: normalizeCoords(entry.coords),
    };
  }

  if (entry.mode !== 'station') {
    return null;
  }

  return {
    id,
    updatedAt,
    mode: 'station',
    stationName,
    lane: normalizeOptionalString(entry.lane),
    side: normalizeEnum<Side>(entry.side, ['left', 'right']),
    rackLevel: normalizeEnum<RackLevel>(entry.rackLevel, ['top', 'bottom']),
    distance: normalizeEnum<Distance>(entry.distance, ['close', 'medium', 'far']),
    floor: normalizeOptionalString(entry.floor),
    rackNumber: normalizeOptionalString(entry.rackNumber),
    notes: normalizeOptionalString(entry.notes),
    photoId: normalizeOptionalString(entry.photoId),
    coords: normalizeCoords(entry.coords),
    visibleFields: normalizeVisibleFields(entry.visibleFields),
  };
}

function normalizeCoords(value: unknown): Coords | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<Record<keyof Coords, unknown>>;
  const lat = candidate.lat;
  const lng = candidate.lng;

  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
    return undefined;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return undefined;
  }

  const accuracy = candidate.accuracy;

  return {
    lat,
    lng,
    accuracy: isFiniteNumber(accuracy) && accuracy >= 0 ? accuracy : undefined,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeVisibleFields(value: unknown): VisibleFields {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const candidate = value as Partial<Record<keyof VisibleFields, unknown>>;
  const visibleFields: VisibleFields = {};

  for (const key of VISIBLE_FIELD_KEYS) {
    if (candidate[key] === true) {
      visibleFields[key] = true;
    }
  }

  return visibleFields;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEnum<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  return typeof value === 'string' && options.includes(value as T) ? (value as T) : undefined;
}
