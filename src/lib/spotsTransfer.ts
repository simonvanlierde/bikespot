import type { AppData, LocationRecord } from "./app-data";
import { RECENT_LIMIT } from "./app-data";
import { normalizeLocationRecord } from "./repository";

const SPOTS_FILE_VERSION = 1;

// A few hundred spots fit in well under this; it stops a huge file from being read into memory.
export const MAX_IMPORT_BYTES = 1_000_000;

// Photos stay on the device that took them, so the file drops their ids:
// on another device they would point at nothing.
export function exportSpots(data: AppData): string {
  const spots = [data.current, ...data.recent]
    .filter((entry): entry is LocationRecord => entry !== null)
    .map(({ photoId: _photoId, ...entry }) => entry);

  return JSON.stringify({ version: SPOTS_FILE_VERSION, spots }, null, 2);
}

// Returns null for anything that is not a version 1 file whose every spot is
// valid: a half-imported file is harder to reason about than a refused one.
export function parseSpotsFile(text: string): LocationRecord[] | null {
  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as { version?: unknown; spots?: unknown };

  if (candidate.version !== SPOTS_FILE_VERSION || !Array.isArray(candidate.spots)) {
    return null;
  }

  const spots = candidate.spots.map((entry) => normalizeLocationRecord(entry));

  // A file's photoId could name another spot's blob; photos never travel in the file.
  return spots.every((entry) => entry !== null)
    ? (spots as LocationRecord[]).map((entry) => ({ ...entry, photoId: undefined }))
    : null;
}

// Imported spots fill the free Recent slots, newest first; they never push out
// a spot (or its photo) the user already has. The current spot is left alone:
// the file cannot say whether that bike is still parked. `skipped` counts new
// spots that found no free slot; spots already known by id are not counted.
export function mergeSpots(data: AppData, spots: LocationRecord[]): { data: AppData; added: number; skipped: number } {
  const known = new Set([data.current?.id, ...data.recent.map((entry) => entry.id)]);
  const incoming = spots
    .filter((entry) => {
      if (known.has(entry.id)) {
        return false;
      }
      known.add(entry.id);
      return true;
    })
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  const accepted = incoming.slice(0, Math.max(0, RECENT_LIMIT - data.recent.length));
  const skipped = incoming.length - accepted.length;

  if (accepted.length === 0) {
    return { data, added: 0, skipped };
  }

  const recent = [...data.recent, ...accepted].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  return { data: { ...data, recent }, added: accepted.length, skipped };
}
