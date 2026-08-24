import type {
  AppData,
  Coords,
  Distance,
  LocationRecord,
  RackLevel,
  Side,
  VisibleFields,
} from "./app-data";
import { RECENT_LIMIT, VISIBLE_FIELD_KEYS } from "./app-data";
import { defaultAppData, defaultStationConfig } from "./defaults";
import { normalizeStationConfig } from "./domain";
import type { LocationDraft, StationLocationDraft } from "./drafts";

export const APP_DATA_STORAGE_KEY = "bikespot-app";

// biome-ignore lint/suspicious/useAwait: async is the storage-boundary contract (localStorage now, IndexedDB later)
export async function loadAppData(): Promise<AppData> {
  // getItem itself can throw when storage is blocked (private mode, extensions).
  try {
    const raw = window.localStorage.getItem(APP_DATA_STORAGE_KEY);
    return raw ? normalizeAppData(JSON.parse(raw)) : defaultAppData;
  } catch {
    return defaultAppData;
  }
}

// biome-ignore lint/suspicious/useAwait: async is the storage-boundary contract (localStorage now, IndexedDB later)
export async function saveAppData(data: AppData): Promise<void> {
  window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data));
}

export const DRAFT_STORAGE_KEY = "bikespot-draft";

export type StoredDraft = {
  draft: LocationDraft;
  showDetails: boolean;
};

// An interrupted edit is worth resuming for about as long as the interruption
// could plausibly belong to the same trip. Past that, restoring it would put a
// stale lane number back in front of the user as if it were today's — the very
// mistake the editor's fresh-draft rule exists to prevent.
export const DRAFT_MAX_AGE_MS = 60 * 60 * 1000;

// The open editor's draft is stored apart from app data: it is unsaved work,
// never a record, and must never be mistaken for a real spot. A pending photo
// is a File, so it cannot be serialized — it is the one part of a draft that a
// refresh still drops.
// biome-ignore lint/suspicious/useAwait: async is the storage-boundary contract (localStorage now, IndexedDB later)
export async function loadDraft(now: number = Date.now()): Promise<StoredDraft | null> {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? normalizeStoredDraft(JSON.parse(raw), now) : null;
  } catch {
    return null;
  }
}

// biome-ignore lint/suspicious/useAwait: async is the storage-boundary contract (localStorage now, IndexedDB later)
export async function saveDraft(draft: LocationDraft, showDetails: boolean): Promise<void> {
  const savedAt = new Date().toISOString();
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ draft, showDetails, savedAt }));
}

// biome-ignore lint/suspicious/useAwait: async is the storage-boundary contract (localStorage now, IndexedDB later)
export async function clearDraft(): Promise<void> {
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}

function normalizeStoredDraft(value: unknown, now: number): StoredDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as { draft?: unknown; showDetails?: unknown; savedAt?: unknown };
  const savedAt =
    typeof candidate.savedAt === "string" ? Date.parse(candidate.savedAt) : Number.NaN;

  // A draft with no readable timestamp is treated as expired: it predates this
  // format, and there is no way to tell whether it still describes this trip.
  if (Number.isNaN(savedAt) || now - savedAt > DRAFT_MAX_AGE_MS || savedAt > now) {
    return null;
  }

  const draft = normalizeLocationDraft(candidate.draft);

  return draft ? { draft, showDetails: candidate.showDetails === true } : null;
}

function normalizeLocationDraft(value: unknown): LocationDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Record<keyof StationLocationDraft, unknown>>;
  const notes = typeof candidate.notes === "string" ? candidate.notes : "";
  const coords = normalizeCoords(candidate.coords) ?? null;

  if (candidate.kind === "outside") {
    return { kind: "outside", notes, photoFile: null, coords };
  }

  if (candidate.kind !== "station") {
    return null;
  }

  // Drafts hold raw input, so text fields keep whatever was typed (including
  // whitespace); only the enums need a fallback to stay renderable.
  return {
    kind: "station",
    lane: normalizeDraftText(candidate.lane),
    side: normalizeEnum<Side>(candidate.side, ["left", "right"]) ?? "right",
    rackLevel: normalizeEnum<RackLevel>(candidate.rackLevel, ["top", "bottom"]) ?? "bottom",
    distance: normalizeEnum<Distance>(candidate.distance, ["close", "middle", "far"]) ?? "middle",
    floor: normalizeDraftText(candidate.floor),
    rackNumber: normalizeDraftText(candidate.rackNumber),
    notes,
    photoFile: null,
    coords,
  };
}

function normalizeDraftText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeAppData(value: unknown): AppData {
  if (!value || typeof value !== "object") {
    return defaultAppData;
  }

  const candidate = value as Partial<AppData>;
  const station = normalizeStationConfig(candidate.station, defaultStationConfig);
  const current = candidate.current ? normalizeLocationRecord(candidate.current) : null;
  const recent = Array.isArray(candidate.recent)
    ? candidate.recent
        .map((entry) => normalizeLocationRecord(entry))
        .filter((entry): entry is LocationRecord => entry !== null)
        .slice(0, RECENT_LIMIT)
    : [];

  // Each field degrades independently: a malformed `recent` becomes empty rather
  // than discarding a valid current spot. Only a blob with nothing salvageable
  // falls back to the friendly starter state.
  if (!current && recent.length === 0) {
    return defaultAppData;
  }

  return {
    station,
    current,
    recent,
  };
}

function normalizeLocationRecord(value: unknown): LocationRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Partial<LocationRecord>;
  const id = typeof entry.id === "string" ? entry.id : null;
  // Must parse to a real date so no consumer downstream ever sees Invalid Date.
  const updatedAt =
    typeof entry.updatedAt === "string" && !Number.isNaN(Date.parse(entry.updatedAt))
      ? entry.updatedAt
      : null;
  const stationName = typeof entry.stationName === "string" ? entry.stationName.trim() : "";

  // Station name is optional: the user may never name their station.
  if (!(id && updatedAt)) {
    return null;
  }

  if (entry.mode === "outside") {
    const outsideDescription =
      typeof entry.outsideDescription === "string" ? entry.outsideDescription.trim() : "";

    return {
      id,
      updatedAt,
      mode: "outside",
      stationName,
      outsideDescription: outsideDescription || undefined,
      notes: normalizeOptionalString(entry.notes),
      photoId: normalizeOptionalString(entry.photoId),
      coords: normalizeCoords(entry.coords),
    };
  }

  if (entry.mode !== "station") {
    return null;
  }

  return {
    id,
    updatedAt,
    mode: "station",
    stationName,
    lane: normalizeOptionalString(entry.lane),
    side: normalizeEnum<Side>(entry.side, ["left", "right"]),
    rackLevel: normalizeEnum<RackLevel>(entry.rackLevel, ["top", "bottom"]),
    distance: normalizeEnum<Distance>(entry.distance, ["close", "middle", "far"]),
    floor: normalizeOptionalString(entry.floor),
    rackNumber: normalizeOptionalString(entry.rackNumber),
    notes: normalizeOptionalString(entry.notes),
    photoId: normalizeOptionalString(entry.photoId),
    coords: normalizeCoords(entry.coords),
    visibleFields: normalizeVisibleFields(entry.visibleFields),
  };
}

function normalizeCoords(value: unknown): Coords | undefined {
  if (!value || typeof value !== "object") {
    return;
  }

  const candidate = value as Partial<Record<keyof Coords, unknown>>;
  const lat = candidate.lat;
  const lng = candidate.lng;

  if (!(isFiniteNumber(lat) && isFiniteNumber(lng))) {
    return;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return;
  }

  const accuracy = candidate.accuracy;

  return {
    lat,
    lng,
    accuracy: isFiniteNumber(accuracy) && accuracy >= 0 ? accuracy : undefined,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeVisibleFields(value: unknown): VisibleFields {
  if (!value || typeof value !== "object") {
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
  if (typeof value !== "string") {
    return;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEnum<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : undefined;
}
