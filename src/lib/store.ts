import { effect, type Signal, signal } from "@preact/signals";
import type { TargetedEvent } from "preact";
import type { Dispatch, SetStateAction } from "preact/compat";

import type { AppData, LocationRecord, OverlayState } from "./app-data";
import { defaultAppData } from "./defaults";
import { promoteRecentLocation, saveLocation, updateStationConfig } from "./domain";
import {
  buildLocationRecordInput,
  createLocationDraft,
  createStationSettingsDraft,
  type LocationDraft,
  type StationSettingsDraft,
} from "./drafts";
import { captureCoords } from "./geolocation";
import { t } from "./i18n";
import {
  clearPhotoBlobs,
  deletePhotoBlob,
  listPhotoIds,
  savePhotoBlob,
  stripPhotoMetadata,
} from "./photos";
import { loadAppData, saveAppData } from "./repository";

export const data = signal<AppData>(defaultAppData);
export const overlay = signal<OverlayState>({ kind: "closed" });
export const locationDraft = signal<LocationDraft | null>(null);
export const stationDraft = signal<StationSettingsDraft | null>(null);
export const showEditorDetails = signal(false);
// A fresh object per notice so posting the same text twice still re-arms the
// auto-dismiss timer keyed on it.
export const notice = signal<{ text: string } | null>(null);
export const hydrated = signal(false);
export const geoStatus = signal<"idle" | "capturing" | "error">("idle");

// Persist app data whenever it changes, but only after the initial load so we
// never overwrite stored data with the default placeholder.
effect(() => {
  const snapshot = data.value;
  const isHydrated = hydrated.value;

  if (!isHydrated) {
    return;
  }

  saveAppData(snapshot).catch(() => {
    notice.value = { text: t.value.noticeSaveFailed };
  });
});

// Resets transient UI state and (re)loads persisted data. Called on App mount,
// which keeps the single production instance and remounting tests consistent.
export function initStore(): () => void {
  // First: a stale `hydrated` from a previous mount would let the persistence
  // effect write the seed over real data when data.value resets below.
  hydrated.value = false;
  data.value = defaultAppData;
  overlay.value = { kind: "closed" };
  locationDraft.value = null;
  stationDraft.value = null;
  showEditorDetails.value = false;
  notice.value = null;
  geoStatus.value = "idle";

  let active = true;

  // biome-ignore lint/complexity/noVoid: deliberate fire-and-forget hydration
  void loadAppData()
    .catch(() => {
      notice.value = { text: t.value.noticeLoadFailed };
      return defaultAppData;
    })
    .then((loaded) => {
      if (!active) {
        return;
      }

      data.value = loaded;
      // Always flip, even after a failed load, so later edits still persist.
      hydrated.value = true;
      // biome-ignore lint/complexity/noVoid: deliberate fire-and-forget cleanup
      void reconcilePhotoBlobs(() => active);
    });

  return () => {
    active = false;
  };
}

// Load-time sweep pairing the commitData diff: deletes stored blobs no record
// references (e.g. the record was dropped by load-normalization) and strips
// photoIds whose blob is gone (e.g. saved via the in-memory fallback in a past
// session), so neither side can leak or dangle forever.
async function reconcilePhotoBlobs(isActive: () => boolean): Promise<void> {
  const snapshot = data.value;
  try {
    const stored = new Set(await listPhotoIds());

    // A save landing during our IO mints a new data.value; its blob and photoId
    // could be misread as orphaned/dangling against these stale snapshots. Bail
    // and let its own commitData (and the next startup) handle cleanup.
    if (!isActive() || data.value !== snapshot) {
      return;
    }

    const referenced = referencedPhotoIds(snapshot);
    await Promise.all([...stored].filter((id) => !referenced.has(id)).map(deletePhotoBlob));

    const dropMissing = (entry: LocationRecord): LocationRecord =>
      entry.photoId && !stored.has(entry.photoId) ? { ...entry, photoId: undefined } : entry;
    const hasDangling =
      (snapshot.current?.photoId && !stored.has(snapshot.current.photoId)) ||
      snapshot.recent.some((entry) => entry.photoId && !stored.has(entry.photoId));

    if (isActive() && data.value === snapshot && hasDangling) {
      data.value = {
        ...snapshot,
        current: snapshot.current ? dropMissing(snapshot.current) : null,
        recent: snapshot.recent.map(dropMissing),
      };
    }
  } catch {
    // Best-effort cleanup; never block or break startup on it.
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

// Applies a data mutation and deletes any photo blobs the mutation orphaned
// (record overwritten or evicted from recent), so IndexedDB doesn't grow forever.
async function commitData(next: AppData): Promise<void> {
  const previousIds = referencedPhotoIds(data.value);
  data.value = next;
  const nextIds = referencedPhotoIds(next);

  // Best-effort: a cleanup failure must not reject the submit/promote flow after
  // data.value has already changed (would leave the sheet open, no success notice).
  await Promise.all(
    [...previousIds]
      .filter((id) => !nextIds.has(id))
      .map((id) => deletePhotoBlob(id).catch(() => undefined)),
  );
}

// Bumped on every open/close so an in-flight geolocation fix from a previous
// editor session can't land on the next one's draft.
let editorSession = 0;

export function openOverlay(next: OverlayState): void {
  editorSession++;
  overlay.value = next;
  showEditorDetails.value = false;
  geoStatus.value = "idle";

  if (next.kind === "edit-location") {
    locationDraft.value = createLocationDraft(data.value.current, data.value.station);
    stationDraft.value = null;
    return;
  }

  if (next.kind === "station-settings") {
    locationDraft.value = null;
    stationDraft.value = createStationSettingsDraft(data.value.station);
    return;
  }

  locationDraft.value = null;
  stationDraft.value = null;
}

export function closeOverlay(): void {
  editorSession++;
  overlay.value = { kind: "closed" };
  locationDraft.value = null;
  stationDraft.value = null;
  showEditorDetails.value = false;
  geoStatus.value = "idle";
}

export async function handleLocationSubmit(event: TargetedEvent<HTMLFormElement>): Promise<void> {
  event.preventDefault();

  const draft = locationDraft.value;

  if (!draft) {
    return;
  }

  const input = buildLocationRecordInput(draft, data.value.station);

  if (!input) {
    return;
  }

  // Persist a newly attached photo only once we know the record is valid,
  // otherwise a failed save would leave an orphaned blob behind.
  let photoId: string | undefined;

  try {
    photoId = draft.photoFile ? await savePhotoBlob(draft.photoFile) : undefined;
  } catch {
    // Keep the sheet open so the user can retry or drop the photo.
    notice.value = { text: t.value.noticeSaveFailed };
    return;
  }

  const nextLocation = photoId ? { ...input, photoId } : input;
  const next = saveLocation(data.value, nextLocation);

  // Close before committing, as in handleUseRecent: the record is persisted
  // synchronously inside commitData; only best-effort blob cleanup is awaited.
  closeOverlay();
  notice.value = { text: t.value.noticeLocationUpdated };
  await commitData(next);
}

export function handleStationSubmit(event: TargetedEvent<HTMLFormElement>): void {
  event.preventDefault();

  const draft = stationDraft.value;

  if (!draft) {
    return;
  }

  // The draft already has StationConfig's shape; normalizeStationConfig inside
  // updateStationConfig owns all sanitization.
  data.value = updateStationConfig(data.value, draft);
  notice.value = { text: t.value.noticeStationUpdated };
  closeOverlay();
}

export async function handleUseRecent(id: string): Promise<void> {
  const next = promoteRecentLocation(data.value, id);

  // Close before committing: commitData removes the previewed entry from
  // `recent`, which would leave the still-open preview sheet rendering nothing
  // while the async blob cleanup runs.
  closeOverlay();
  notice.value = { text: t.value.noticeLocationFromRecent };
  await commitData(next);
}

export async function handlePhotoChange(event: TargetedEvent<HTMLInputElement>): Promise<void> {
  const picked = event.currentTarget.files?.[0] ?? null;
  // Reset the input so picking the same file after a remove still fires change.
  event.currentTarget.value = "";

  if (!locationDraft.value) {
    return;
  }

  const session = editorSession;
  const file = picked ? await stripPhotoMetadata(picked) : null;
  const draft = locationDraft.value;

  if (!draft || session !== editorSession) {
    return;
  }

  locationDraft.value = { ...draft, photoFile: file };
}

export function handlePhotoRemove(): void {
  const draft = locationDraft.value;

  if (!draft) {
    return;
  }

  locationDraft.value = { ...draft, photoFile: null };
}

export async function handleCaptureLocation(): Promise<void> {
  const draft = locationDraft.value;

  if (!draft) {
    return;
  }

  geoStatus.value = "capturing";
  const session = editorSession;

  try {
    const coords = await captureCoords();

    if (session !== editorSession) {
      return;
    }

    if (!coords || locationDraft.value === null) {
      geoStatus.value = coords ? "idle" : "error";
      return;
    }

    locationDraft.value = { ...locationDraft.value, coords };
    geoStatus.value = "idle";
  } catch {
    if (session === editorSession) {
      geoStatus.value = "error";
    }
  }
}

export async function handleClearAllData(): Promise<void> {
  if (!window.confirm(t.value.clearAllDataConfirm)) {
    return;
  }

  closeOverlay();
  data.value = { ...defaultAppData, current: null, recent: [] };
  notice.value = { text: t.value.noticeDataCleared };
  await clearPhotoBlobs().catch(() => undefined);
}

export function toggleEditorDetails(): void {
  showEditorDetails.value = !showEditorDetails.value;
}

function signalSetter<T>(target: Signal<T | null>): Dispatch<SetStateAction<T>> {
  return (updater) => {
    const previous = target.value;

    if (previous === null) {
      return;
    }

    target.value =
      typeof updater === "function" ? (updater as (previous: T) => T)(previous) : updater;
  };
}

export const setLocationDraft = signalSetter(locationDraft);
export const setStationDraft = signalSetter(stationDraft);
