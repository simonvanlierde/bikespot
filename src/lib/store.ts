import { effect, signal } from '@preact/signals';
import type { TargetedEvent } from 'preact';
import type { Dispatch, SetStateAction } from 'preact/compat';

import type { AppData, OverlayState } from './app-data';
import { defaultAppData } from './defaults';
import { promoteRecentLocation, saveLocation, updateStationConfig } from './domain';
import {
  buildLocationRecordInput,
  buildStationConfig,
  createLocationDraft,
  createStationSettingsDraft,
  type LocationDraft,
  type StationSettingsDraft,
} from './drafts';
import { captureCoords } from './geolocation';
import { loadAppData, saveAppData, savePhoto } from './repository';

export const data = signal<AppData>(defaultAppData);
export const overlay = signal<OverlayState>({ kind: 'closed' });
export const locationDraft = signal<LocationDraft | null>(null);
export const stationDraft = signal<StationSettingsDraft | null>(null);
export const showEditorDetails = signal(false);
export const notice = signal('');
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

  void saveAppData(snapshot);
});

// Resets transient UI state and (re)loads persisted data. Called on App mount,
// which keeps the single production instance and remounting tests consistent.
export function initStore(): () => void {
  data.value = defaultAppData;
  overlay.value = { kind: 'closed' };
  locationDraft.value = null;
  stationDraft.value = null;
  showEditorDetails.value = false;
  notice.value = '';
  hydrated.value = false;
  geoStatus.value = 'idle';

  let active = true;

  void loadAppData().then((loaded) => {
    if (!active) {
      return;
    }

    data.value = loaded;
    hydrated.value = true;
  });

  return () => {
    active = false;
  };
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

  const photoId = draft.photoFile ? await savePhoto(draft.photoFile) : undefined;
  const nextLocation = buildLocationRecordInput(draft, data.value.station, photoId);

  if (!nextLocation) {
    return;
  }

  data.value = saveLocation(data.value, nextLocation);
  notice.value = 'Location updated';
  closeOverlay();
}

export function handleStationSubmit(event: TargetedEvent<HTMLFormElement>): void {
  event.preventDefault();

  const draft = stationDraft.value;

  if (!draft) {
    return;
  }

  data.value = updateStationConfig(data.value, buildStationConfig(draft));
  notice.value = 'Station settings updated';
  closeOverlay();
}

export function handleUseRecent(id: string): void {
  data.value = promoteRecentLocation(data.value, id);
  notice.value = 'Location updated from recent';
  closeOverlay();
}

export function handlePhotoChange(event: TargetedEvent<HTMLInputElement>): void {
  const file = event.currentTarget.files?.[0] ?? null;
  const draft = locationDraft.value;

  if (!draft) {
    return;
  }

  locationDraft.value = { ...draft, photoFile: file };
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

export const setLocationDraft: Dispatch<SetStateAction<LocationDraft>> = (updater) => {
  const previous = locationDraft.value;

  if (previous === null) {
    return;
  }

  locationDraft.value =
    typeof updater === 'function'
      ? (updater as (previous: LocationDraft) => LocationDraft)(previous)
      : updater;
};

export const setStationDraft: Dispatch<SetStateAction<StationSettingsDraft>> = (updater) => {
  const previous = stationDraft.value;

  if (previous === null) {
    return;
  }

  stationDraft.value =
    typeof updater === 'function'
      ? (updater as (previous: StationSettingsDraft) => StationSettingsDraft)(previous)
      : updater;
};
