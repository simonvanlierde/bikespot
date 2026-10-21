import type { AppData, LocationRecord } from "./app-data";
import { RECENT_LIMIT } from "./app-data";
import { normalizeLocationRecord } from "./repository";

const SPOTS_FILE_VERSION = 1;

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

  return spots.every((entry) => entry !== null) ? (spots as LocationRecord[]) : null;
}

// Imported spots join Recent, newest first, within the usual cap. The current
// spot is left alone: the file cannot say whether that bike is still parked.
// `added` counts only spots that made it past the id check and the cap.
export function mergeSpots(
  data: AppData,
  spots: LocationRecord[],
): { data: AppData; added: number } {
  const known = new Set([data.current?.id, ...data.recent.map((entry) => entry.id)]);
  const incoming = spots.filter((entry) => {
    if (known.has(entry.id)) {
      return false;
    }
    known.add(entry.id);
    return true;
  });

  const recent = [...data.recent, ...incoming]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, RECENT_LIMIT);
  const added = recent.filter((entry) => incoming.includes(entry)).length;

  return { data: added > 0 ? { ...data, recent } : data, added };
}
