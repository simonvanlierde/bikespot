import { effect, type Signal, signal } from '@preact/signals';
import type { TargetedEvent } from 'preact';
import type { Dispatch, SetStateAction } from 'preact/compat';

import type { AppData, LocationRecord, OverlayState } from './app-data';
import { defaultAppData } from './defaults';
import { promoteRecentLocation, saveLocation, updateStationConfig } from './domain';
import {
  buildLocationRecordInput,
  createLocationDraft,
  createStationSettingsDraft,
  type LocationDraft,
  type StationSettingsDraft,
} from './drafts';
import { captureCoords } from './geolocation';
import { deletePhotoBlob, listPhotoIds, savePhotoBlob } from './photos';
import { loadAppData, saveAppData } from './repository';

export const data = signal<AppData>(defaultAppData);
export const overlay = signal<OverlayState>({ kind: 'closed' });
export const locationDraft = signal<LocationDraft | null>(null);
export const stationDraft = signal<StationSettingsDraft | null>(null);
export const showEditorDetails = signal(false);
// A fresh object per notice so posting the same text twice still re-arms the
// auto-dismiss timer keyed on it.
export const notice = signal<{ text: string } | null>(null);
export const hydrated = signal(false);
export const geoStatus = signal<'idle' | 'capturing' | 'error'>('idle');

// Persist app data whenever it changes, but only after the initial load so we
// never overwrite stored data with the default placeholder.
effect(() => {
  const snapshot = data.value;
  const isHydrated = hydrated.value;

  if (!isHydrated) {
    return;
  }

  saveAppData(snapshot).catch(() => {
    notice.value = { text: 'Could not save — storage is full or blocked' };
  });
});

// Resets transient UI state and (re)loads persisted data. Called on App mount,
// which keeps the single production instance and remounting tests consistent.
export function initStore(): () => void {
  data.value = defaultAppData;
  overlay.value = { kind: 'closed' };
  locationDraft.value = null;
  stationDraft.value = null;
  showEditorDetails.value = false;
  notice.value = null;
  hydrated.value = false;
  geoStatus.value = 'idle';

  let active = true;

  void loadAppData().then((loaded) => {
    if (!active) {
      return;
    }

    data.value = loaded;
    hydrated.value = true;
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

  await Promise.all([...previousIds].filter((id) => !nextIds.has(id)).map(deletePhotoBlob));
}

export function openOverlay(next: OverlayState): void {
  overlay.value = next;
  showEditorDetails.value = false;
  geoStatus.value = 'idle';

  if (next.kind === 'edit-location') {
    locationDraft.value = createLocationDraft(data.value.current, data.value.station);
    stationDraft.value = null;
    return;
  }

  if (next.kind === 'station-settings') {
    locationDraft.value = null;
    stationDraft.value = createStationSettingsDraft(data.value.station);
    return;
  }

  locationDraft.value = null;
  stationDraft.value = null;
}

export function closeOverlay(): void {
  overlay.value = { kind: 'closed' };
  locationDraft.value = null;
  stationDraft.value = null;
  showEditorDetails.value = false;
  geoStatus.value = 'idle';
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
  const photoId = draft.photoFile ? await savePhotoBlob(draft.photoFile) : undefined;
  const nextLocation = photoId ? { ...input, photoId } : input;

  await commitData(saveLocation(data.value, nextLocation));
  notice.value = { text: 'Location updated' };
  closeOverlay();
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
  notice.value = { text: 'Station settings updated' };
  closeOverlay();
}

export async function handleUseRecent(id: string): Promise<void> {
  const next = promoteRecentLocation(data.value, id);

  // Close before committing: commitData removes the previewed entry from
  // `recent`, which would leave the still-open preview sheet rendering nothing
  // while the async blob cleanup runs.
  closeOverlay();
  notice.value = { text: 'Location updated from recent' };
  await commitData(next);
}

export function handlePhotoChange(event: TargetedEvent<HTMLInputElement>): void {
  const file = event.currentTarget.files?.[0] ?? null;
  // Reset the input so picking the same file after a remove still fires change.
  event.currentTarget.value = '';
  const draft = locationDraft.value;

  if (!draft) {
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

  geoStatus.value = 'capturing';

  try {
    const coords = await captureCoords();

    if (!coords || locationDraft.value === null) {
      geoStatus.value = coords ? 'idle' : 'error';
      return;
    }

    locationDraft.value = { ...locationDraft.value, coords };
    geoStatus.value = 'idle';
  } catch {
    geoStatus.value = 'error';
  }
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
      typeof updater === 'function' ? (updater as (previous: T) => T)(previous) : updater;
  };
}

export const setLocationDraft = signalSetter(locationDraft);
export const setStationDraft = signalSetter(stationDraft);
