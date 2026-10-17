import type { AppData, Coords, LocationRecord, VisibleFields } from "./app-data";
import { DISTANCES, RACK_LEVELS, RECENT_LIMIT, SIDES, VISIBLE_FIELD_KEYS } from "./app-data";
import { defaultAppData, defaultStationConfig } from "./defaults";
import { normalizeStationConfig } from "./domain";
import type { LocationDraft, StationLocationDraft } from "./drafts";
import { clearPhotoBlobs, deletePhotoBlob, listPhotoIds, savePhotoBlob } from "./photos";

export const APP_DATA_STORAGE_KEY = "bikespot-app";

// The last stored app data that could not be read in full, kept as raw text so
// a bad load never destroys it. One key: a newer unreadable load replaces it.
export const UNREADABLE_BACKUP_KEY = "bikespot-app-unreadable";

/** "all": nothing could be read; "some": records were dropped; null: nothing lost. */
export type LoadLoss = "all" | "some" | null;

export type LoadedAppData = { data: AppData; lost: LoadLoss };

// Set when unreadable data could not be backed up: saving would then destroy it.
let keepStoredData = false;

export function loadAppData(): LoadedAppData {
  let raw: string | null;

  // getItem itself can throw when storage is blocked (private mode, extensions).
  try {
    raw = window.localStorage.getItem(APP_DATA_STORAGE_KEY);
  } catch {
    return { data: defaultAppData, lost: null };
  }

  if (!raw) {
    return { data: defaultAppData, lost: null };
  }

  let loaded: LoadedAppData;

  try {
    loaded = normalizeAppData(JSON.parse(raw));
  } catch {
    loaded = { data: defaultAppData, lost: "all" };
  }

  try {
    if (loaded.lost) {
      window.localStorage.setItem(UNREADABLE_BACKUP_KEY, raw);
    }
    keepStoredData = false;
  } catch {
    keepStoredData = true;
  }

  return loaded;
}

// Throws when storage is full or blocked; the caller tells the user.
export function saveAppData(data: AppData): void {
  if (keepStoredData) {
    throw new Error("Unreadable app data has no backup yet");
  }

  window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data));
}

export function clearUnreadableBackup(): void {
  window.localStorage.removeItem(UNREADABLE_BACKUP_KEY);
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
export function loadDraft(now: number = Date.now()): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? normalizeStoredDraft(JSON.parse(raw), now) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: LocationDraft, showDetails: boolean): void {
  const savedAt = new Date().toISOString();
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ draft, showDetails, savedAt }));
}

export function clearDraft(): void {
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}

// Everything the store keeps on the device, behind one seam a test can swap.
// App data and drafts are synchronous localStorage calls. Photos are blobs in
// IndexedDB (ADR 0001), linked to records only by photoId, so this seam also
// keeps the two in step.
export type SpotRepository = {
  loadAppData(): LoadedAppData;
  saveAppData(data: AppData): void;
  clearUnreadableBackup(): void;
  loadDraft(): StoredDraft | null;
  saveDraft(draft: LocationDraft, showDetails: boolean): void;
  clearDraft(): void;
  savePhoto(blob: Blob): Promise<string>;
  /** Deletes the blobs `previous` used that `next` no longer does. Never rejects. */
  dropUnusedPhotos(previous: AppData, next: AppData): Promise<void>;
  /**
   * Load-time sweep: deletes blobs no record uses, and resolves to `data` minus
   * the photoIds whose blob is gone, or to null when there is nothing to strip
   * or `isCurrent()` turned false during the IO. Never rejects.
   */
  reconcilePhotos(data: AppData, isCurrent: () => boolean): Promise<AppData | null>;
  clearPhotos(): Promise<void>;
};

export const browserRepository: SpotRepository = {
  loadAppData,
  saveAppData,
  clearUnreadableBackup,
  loadDraft,
  saveDraft,
  clearDraft,
  savePhoto: savePhotoBlob,
  dropUnusedPhotos,
  reconcilePhotos,
  clearPhotos: clearPhotoBlobs,
};

async function dropUnusedPhotos(previous: AppData, next: AppData): Promise<void> {
  const nextIds = referencedPhotoIds(next);

  // Best-effort: a failed delete only leaves a blob for the next load-time sweep.
  await Promise.all(
    [...referencedPhotoIds(previous)]
      .filter((id) => !nextIds.has(id))
      .map((id) => deletePhotoBlob(id).catch(() => undefined)),
  );
}

// Catches blobs no record uses (e.g. a deleted record left one behind) and
// photoIds whose blob is gone (e.g. saved via the in-memory fallback in a past
// session), so neither side can leak or dangle forever.
async function reconcilePhotos(data: AppData, isCurrent: () => boolean): Promise<AppData | null> {
  try {
    const stored = new Set(await listPhotoIds());

    // A save landing during our IO mints new app data; its blob and photoId
    // could be misread as orphaned or dangling against this stale snapshot.
    // Bail and let that save's own cleanup (and the next startup) handle it.
    if (!isCurrent()) {
      return null;
    }

    const referenced = referencedPhotoIds(data);
    // Photos of records only the unreadable backup still holds stay with it.
    const backup = window.localStorage.getItem(UNREADABLE_BACKUP_KEY) ?? "";
    await Promise.all(
      [...stored].filter((id) => !(referenced.has(id) || backup.includes(id))).map(deletePhotoBlob),
    );

    const dropMissing = (entry: LocationRecord): LocationRecord =>
      entry.photoId && !stored.has(entry.photoId) ? { ...entry, photoId: undefined } : entry;
    const hasDangling =
      (data.current?.photoId && !stored.has(data.current.photoId)) ||
      data.recent.some((entry) => entry.photoId && !stored.has(entry.photoId));

    return hasDangling
      ? {
          ...data,
          current: data.current ? dropMissing(data.current) : null,
          recent: data.recent.map(dropMissing),
        }
      : null;
  } catch {
    // Best-effort cleanup; never block or break startup on it.
    return null;
  }
}

function referencedPhotoIds(value: AppData): Set<string> {
  const ids = new Set<string>();

  if (value.current?.photoId) {
    ids.add(value.current.photoId);
  }

  for (const entry of value.recent) {
    if (entry.photoId) {
      ids.add(entry.photoId);
    }
  }

  return ids;
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
    side: normalizeEnum(candidate.side, SIDES) ?? "right",
    rackLevel: normalizeEnum(candidate.rackLevel, RACK_LEVELS) ?? "bottom",
    distance: normalizeEnum(candidate.distance, DISTANCES) ?? "middle",
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

function normalizeAppData(value: unknown): LoadedAppData {
  // The app always writes an object with a station, so anything else is not
  // its data (or an older format) and none of it can be used.
  if (!value || typeof value !== "object" || !("station" in value)) {
    return { data: defaultAppData, lost: "all" };
  }

  const candidate = value as Partial<AppData>;
  const station = normalizeStationConfig(candidate.station, defaultStationConfig);
  const current = candidate.current ? normalizeLocationRecord(candidate.current) : null;
  const storedRecent: unknown[] = Array.isArray(candidate.recent) ? candidate.recent : [];
  const recent = storedRecent
    .map((entry) => normalizeLocationRecord(entry))
    .filter((entry): entry is LocationRecord => entry !== null);
  const dropped =
    (candidate.current && !current) ||
    recent.length < storedRecent.length ||
    (candidate.recent !== undefined && !Array.isArray(candidate.recent));

  // Each field degrades independently: a malformed `recent` becomes empty rather
  // than discarding a valid current spot or the station settings.
  return {
    data: { station, current, recent: recent.slice(0, RECENT_LIMIT) },
    lost: dropped ? "some" : null,
  };
}

export function normalizeLocationRecord(value: unknown): LocationRecord | null {
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
    side: normalizeEnum(entry.side, SIDES),
    rackLevel: normalizeEnum(entry.rackLevel, RACK_LEVELS),
    distance: normalizeEnum(entry.distance, DISTANCES),
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
