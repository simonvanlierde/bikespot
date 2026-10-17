import { effect, type Signal, signal } from "@preact/signals";
import type { TargetedEvent } from "preact";
import type { Dispatch, SetStateAction } from "preact/compat";

import type { AppData, OverlayState } from "./app-data";
import { defaultAppData } from "./defaults";
import {
  clearCurrentLocation,
  promoteRecentLocation,
  removeRecentLocation,
  saveLocation,
  updateStationConfig,
} from "./domain";
import {
  buildLocationRecordInput,
  createLocationDraft,
  createStationSettingsDraft,
  type LocationDraft,
  type StationSettingsDraft,
} from "./drafts";
import { captureCoords } from "./geolocation";
import { t } from "./i18n";
import { stripPhotoMetadata } from "./photos";
import { browserRepository as repo, type StoredDraft } from "./repository";
import { exportSpots, mergeSpots, parseSpotsFile } from "./spotsTransfer";

export const data = signal<AppData>(defaultAppData);
export const overlay = signal<OverlayState>({ kind: "closed" });
export const locationDraft = signal<LocationDraft | null>(null);
export const stationDraft = signal<StationSettingsDraft | null>(null);
export const showEditorDetails = signal(false);
// A fresh object per notice so posting the same text twice still re-arms the
// auto-dismiss timer keyed on it. Errors stay until dismissed or replaced.
export const notice = signal<{ text: string; tone?: "error" } | null>(null);
// Validation message for the open editor; cleared on every open/close.
export const editorError = signal<string | null>(null);
export const hydrated = signal(false);
export const geoStatus = signal<"idle" | "capturing" | "error">("idle");
// True while the draft's photo is the original file, EXIF location included,
// because this browser could not re-encode it.
export const photoMetadataKept = signal(false);

// Persist app data whenever it changes, but only after the initial load so we
// never overwrite stored data with the default placeholder.
effect(() => {
  const snapshot = data.value;
  const isHydrated = hydrated.value;

  if (!isHydrated) {
    return;
  }

  try {
    repo.saveAppData(snapshot);
  } catch {
    notice.value = { text: t.value.noticeSaveFailed, tone: "error" };
  }
});

// A draft left behind by a refresh mid-edit, handed to the next editor open.
let restoredDraft: StoredDraft | null = null;

// Keep the open editor's draft on disk so a reload — or the OS reclaiming a
// backgrounded tab — doesn't throw away what was typed. This only ever writes
// while the editor is open; clearing is explicit on save and cancel, so the
// reset inside initStore can't wipe a draft before it has been read back.
effect(() => {
  const draft = locationDraft.value;
  const showDetails = showEditorDetails.value;

  if (overlay.value.kind !== "edit-location" || !draft) {
    return;
  }

  ignoreFailure(() => repo.saveDraft(draft, showDetails));
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
  editorError.value = null;
  geoStatus.value = "idle";
  photoMetadataKept.value = false;
  restoredDraft = null;

  let active = true;

  data.value = repo.loadAppData();
  restoredDraft = repo.loadDraft();
  hydrated.value = true;

  const snapshot = data.value;
  const isCurrent = () => active && data.value === snapshot;
  // biome-ignore lint/complexity/noVoid: deliberate fire-and-forget cleanup
  void repo.reconcilePhotos(snapshot, isCurrent).then((cleaned) => {
    if (cleaned && isCurrent()) {
      data.value = cleaned;
    }
  });

  return () => {
    active = false;
  };
}

// Applies a data mutation and deletes any photo blobs it orphaned (record
// overwritten or evicted from recent), so IndexedDB doesn't grow forever.
async function commitData(next: AppData): Promise<void> {
  const previous = data.value;
  data.value = next;
  await repo.dropUnusedPhotos(previous, next);
}

// Bumped on every open/close so an in-flight geolocation fix from a previous
// editor session can't land on the next one's draft.
let editorSession = 0;

export function openOverlay(next: OverlayState): void {
  editorSession++;
  overlay.value = next;
  showEditorDetails.value = false;
  editorError.value = null;
  geoStatus.value = "idle";
  photoMetadataKept.value = false;

  if (next.kind === "edit-location") {
    // Work saved from an interrupted edit wins over a fresh draft, but only
    // once: after this the user either saves or cancels, and both clear it.
    locationDraft.value =
      restoredDraft?.draft ?? createLocationDraft(data.value.current, data.value.station);
    showEditorDetails.value = restoredDraft?.showDetails ?? false;
    restoredDraft = null;
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
  editorError.value = null;
  geoStatus.value = "idle";
  photoMetadataKept.value = false;
  // Saving and cancelling both land here, and both mean the draft is spent.
  restoredDraft = null;
  ignoreFailure(() => repo.clearDraft());
}

export async function handleLocationSubmit(event: TargetedEvent<HTMLFormElement>): Promise<void> {
  event.preventDefault();

  const draft = locationDraft.value;

  if (!draft) {
    return;
  }

  const input = buildLocationRecordInput(draft, data.value.station);

  if (!input) {
    const laneMissing =
      draft.kind === "station" && data.value.station.enabledFields.lane && !draft.lane.trim();
    editorError.value = laneMissing ? t.value.errorLaneRequired : t.value.errorNothingToFindBy;
    return;
  }

  editorError.value = null;

  // Persist a newly attached photo only once we know the record is valid,
  // otherwise a failed save would leave an orphaned blob behind.
  let photoId: string | undefined;

  try {
    photoId = draft.photoFile ? await repo.savePhoto(draft.photoFile) : undefined;
  } catch {
    // Keep the sheet open so the user can retry or drop the photo.
    notice.value = { text: t.value.noticeSaveFailed, tone: "error" };
    return;
  }

  const nextLocation = photoId ? { ...input, photoId } : input;
  const previous = data.value.current;
  const next = saveLocation(data.value, nextLocation);
  const replaced = previous !== null && next.recent[0] === previous;

  // Close before committing, as in handleUseRecent: the record is persisted
  // synchronously inside commitData; only best-effort blob cleanup is awaited.
  closeOverlay();
  notice.value = {
    text: replaced ? t.value.noticeLocationReplaced : t.value.noticeLocationUpdated,
  };
  await commitData(next);
  requestPersistentStorage();
}

let persistRequested = false;

// Without this the browser may evict localStorage and IndexedDB under storage
// pressure, taking the saved spot and photo with it. Asked once, after the
// first save, so a first visit gets no prompt (Firefox asks the user).
// Unsupported or refused is fine: storage then stays best-effort.
function requestPersistentStorage(): void {
  if (persistRequested) {
    return;
  }

  persistRequested = true;
  navigator.storage?.persist?.().catch(() => undefined);
}

// Settings apply as you change them — there is no Save step. The draft stays
// the UI's source of truth (a half-typed preset label is blank there but
// dropped by normalization), the config gets the sanitized view.
export function handleStationChange(updater: SetStateAction<StationSettingsDraft>): void {
  setStationDraft(updater);

  const draft = stationDraft.value;

  if (draft) {
    data.value = updateStationConfig(data.value, draft);
  }
}

export async function handleClearCurrent(): Promise<void> {
  const next = clearCurrentLocation(data.value);
  closeOverlay();
  notice.value = { text: t.value.noticeCollected };
  await commitData(next);
}

export async function handleRemoveRecent(id: string): Promise<void> {
  const next = removeRecentLocation(data.value, id);
  openOverlay({ kind: "recent-list" });
  notice.value = { text: t.value.noticeRecentRemoved };
  await commitData(next);
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
  const stripped = picked ? await stripPhotoMetadata(picked) : null;
  const draft = locationDraft.value;

  if (!draft || session !== editorSession) {
    return;
  }

  // The photo never leaves the device, so keep it rather than lose the
  // reference, but say its location metadata is still in it.
  photoMetadataKept.value = picked !== null && stripped === null;
  locationDraft.value = { ...draft, photoFile: stripped ?? picked };
}

export function handlePhotoRemove(): void {
  const draft = locationDraft.value;

  if (!draft) {
    return;
  }

  photoMetadataKept.value = false;
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
  // biome-ignore lint/suspicious/noAlert: a native confirm is the honest guard for a one-off destructive action
  if (!window.confirm(t.value.clearAllDataConfirm)) {
    return;
  }

  closeOverlay();
  data.value = defaultAppData;
  notice.value = { text: t.value.noticeDataCleared };
  await repo.clearPhotos().catch(() => undefined);
}

export function handleExportSpots(): void {
  const blob = new Blob([exportSpots(data.value)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bikespot-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function handleImportSpots(event: TargetedEvent<HTMLInputElement>): Promise<void> {
  const file = event.currentTarget.files?.[0];
  // Reset the input so picking the same file again still fires change.
  event.currentTarget.value = "";

  if (!file) {
    return;
  }

  const spots = parseSpotsFile(await file.text().catch(() => ""));

  if (!spots) {
    notice.value = { text: t.value.noticeImportInvalid, tone: "error" };
    return;
  }

  const result = mergeSpots(data.value, spots);
  data.value = result.data;
  notice.value = { text: t.value.noticeImported(result.added) };
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

// Draft writes are a convenience: a full or blocked storage must not break editing.
function ignoreFailure(write: () => void): void {
  try {
    write();
  } catch {
    // Nothing to tell the user; the edit itself is still in memory.
  }
}
