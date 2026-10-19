import { effect, signal } from "@preact/signals";
import type { TargetedEvent } from "preact";
import type { SetStateAction } from "preact/compat";

import type { AppData, LocationRecord, StationConfig } from "./app-data";
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
import { downscalePhoto } from "./photos";
import { browserRepository, type LoadLoss, type SpotRepository } from "./repository";
import { exportSpots, mergeSpots, parseSpotsFile } from "./spotsTransfer";

// What a caller asks to open. The store builds any draft the overlay needs.
export type OverlayRequest =
  | { kind: "closed" }
  | { kind: "edit-location" }
  | { kind: "station-settings" }
  | { kind: "location-details" }
  | { kind: "recent-list" }
  | { kind: "spot-map" }
  | { kind: "recent-preview"; id: string };

// Everything the open location editor holds. It exists only while the editor
// is open, so no draft, error or GPS state can outlive it.
export type EditorState = {
  kind: "edit-location";
  draft: LocationDraft;
  showDetails: boolean;
  // Validation message; every opening starts without one.
  error: string | null;
  geoStatus: "idle" | "capturing" | "error";
  // True while the draft's photo is the original file, EXIF location included,
  // because this browser could not re-encode it.
  photoMetadataKept: boolean;
  // New on every opening, so a photo or GPS fix still in flight from an
  // earlier opening can't land on this one's draft.
  session: number;
};

// Which overlay is open, with the state that belongs to it.
export type OverlayState =
  | Exclude<OverlayRequest, { kind: "edit-location" } | { kind: "station-settings" }>
  | EditorState
  | { kind: "station-settings"; draft: StationSettingsDraft };

// A notice with `undo` offers to reverse the action it reports. The store
// dismisses it when the undo window ends, so the UI's auto-dismiss skips it.
// `saved` marks the confirmation of a save from the editor; the sign flips its
// values in once for it.
export type Notice = { text: string; tone?: "error"; undo?: () => void; saved?: true };

// Long enough to read the notice and reach Undo by keyboard or switch access,
// short enough that the removed photo does not linger.
export const UNDO_WINDOW_MS = 10_000;

export type Store = ReturnType<typeof createStore>;

// The app makes one store, and each test can make its own. Creating it reads
// storage synchronously; start() wires persistence and runs the photo sweep.
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: the handlers share the store's closure
export function createStore(repo: SpotRepository = browserRepository) {
  const loaded = repo.loadAppData();
  const data = signal<AppData>(loaded.data);
  const overlay = signal<OverlayState>({ kind: "closed" });
  // A fresh object per notice so posting the same text twice still re-arms the
  // auto-dismiss timer keyed on it. Errors stay until dismissed or replaced.
  const notice = signal<Notice | null>(lostDataNotice(loaded.lost));
  // The raw text of unreadable data kept on the device, until the user clears it.
  const unreadableBackup = signal<string | null>(repo.loadUnreadableBackup());

  // A draft left behind by a refresh mid-edit, handed to the next editor open.
  let restoredDraft = repo.loadDraft();
  let editorSessions = 0;
  let persistRequested = false;
  // The last photo pick's downscale and draft update; never rejects.
  let photoInFlight: Promise<void> = Promise.resolve();
  // Whether the last write of app data reached storage. When it did not, the
  // disk still holds the records the in-memory change dropped, photos included.
  let lastSaveOk = true;
  let pendingRemoval: {
    record: LocationRecord;
    notice: Notice;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;

  function start(): () => void {
    let active = true;

    // Persist app data whenever it changes.
    const stopSaving = effect(() => {
      const snapshot = data.value;

      try {
        repo.saveAppData(snapshot);
        lastSaveOk = true;
      } catch {
        lastSaveOk = false;
        notice.value = { text: t.value.noticeSaveFailed, tone: "error" };
      }
    });

    // Keep the open editor's draft on disk so a reload, or the OS reclaiming a
    // backgrounded tab, doesn't throw away what was typed. This only ever
    // writes while the editor is open; clearing is explicit on save and cancel.
    const stopDraftSaving = effect(() => {
      const current = overlay.value;

      if (current.kind === "edit-location") {
        ignoreFailure(() => repo.saveDraft(current.draft, current.showDetails));
      }
    });

    // biome-ignore lint/complexity/noVoid: deliberate fire-and-forget cleanup
    void sweepPhotos(() => active);

    return () => {
      active = false;
      stopSaving();
      stopDraftSaving();
    };
  }

  // Deletes photos nothing refers to any more, and drops references to photos
  // that are gone, unless the data changed while the sweep ran.
  async function sweepPhotos(isActive: () => boolean = () => true): Promise<void> {
    const snapshot = data.value;
    const isCurrent = () => isActive() && data.value === snapshot;
    const cleaned = await repo.reconcilePhotos(snapshot, isCurrent);

    if (cleaned && isCurrent()) {
      data.value = cleaned;
    }
  }

  // The open editor, or null. Given a session, only that same opening counts.
  function openEditor(session?: number): EditorState | null {
    const current = overlay.value;

    return current.kind === "edit-location" &&
      (session === undefined || current.session === session)
      ? current
      : null;
  }

  function patchEditor(session: number, patch: Partial<Omit<EditorState, "kind" | "session">>) {
    const editor = openEditor(session);

    if (editor) {
      overlay.value = { ...editor, ...patch };
    }
  }

  // Applies a data mutation and deletes any photo blobs it orphaned (record
  // overwritten or evicted from recent), so IndexedDB doesn't grow forever.
  async function commitData(next: AppData): Promise<void> {
    const previous = data.value;
    data.value = next;

    // The save effect has run by now. If it failed, the stored records still
    // use these photos; the next load-time sweep removes whatever ends up unused.
    if (lastSaveOk) {
      await repo.dropUnusedPhotos(previous, next);
    }
  }

  function openOverlay(request: OverlayRequest): void {
    if (request.kind === "edit-location") {
      // Work saved from an interrupted edit wins over a fresh draft, but only
      // once: after this the user either saves or cancels, and both clear it.
      overlay.value = {
        kind: "edit-location",
        draft: restoredDraft?.draft ?? createLocationDraft(data.value.current, data.value.station),
        showDetails: restoredDraft?.showDetails ?? false,
        error: null,
        geoStatus: "idle",
        photoMetadataKept: false,
        session: ++editorSessions,
      };
      restoredDraft = null;
      return;
    }

    if (request.kind === "station-settings") {
      overlay.value = {
        kind: "station-settings",
        draft: createStationSettingsDraft(data.value.station),
      };
      return;
    }

    overlay.value = request;
  }

  function closeOverlay(): void {
    const closingEditor = overlay.value.kind === "edit-location";
    overlay.value = { kind: "closed" };

    // Saving and cancelling the editor both land here, and both mean the draft
    // is spent. Closing any other sheet keeps a draft waiting for the editor.
    if (closingEditor) {
      discardDraft();
    }
  }

  function discardDraft(): void {
    restoredDraft = null;
    ignoreFailure(() => repo.clearDraft());
  }

  async function handleLocationSubmit(event: TargetedEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    // A photo picked just before Save is still being shrunk; wait so it is saved.
    await photoInFlight;

    const editor = openEditor();

    if (!editor) {
      return;
    }

    const { draft } = editor;
    const input = buildLocationRecordInput(draft, data.value.station);

    if (!input) {
      patchEditor(editor.session, { error: whyNotSavable(draft, data.value.station) });
      return;
    }

    patchEditor(editor.session, { error: null });

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
      saved: true,
    };
    await commitData(next);
    requestPersistentStorage();
  }

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

  function setLocationDraft(updater: SetStateAction<LocationDraft>): void {
    const editor = openEditor();

    if (editor) {
      patchEditor(editor.session, { draft: applyUpdate(updater, editor.draft) });
    }
  }

  function toggleEditorDetails(): void {
    const editor = openEditor();

    if (editor) {
      patchEditor(editor.session, { showDetails: !editor.showDetails });
    }
  }

  async function handlePhotoChange(event: TargetedEvent<HTMLInputElement>): Promise<void> {
    const picked = event.currentTarget.files?.[0] ?? null;
    // Reset the input so picking the same file after a remove still fires change.
    event.currentTarget.value = "";

    const editor = openEditor();

    if (!editor) {
      return;
    }

    photoInFlight = (async () => {
      const shrunk = picked ? await downscalePhoto(picked) : null;
      const current = openEditor(editor.session);

      if (current) {
        patchEditor(current.session, {
          draft: { ...current.draft, photoFile: shrunk ?? picked },
          // The photo never leaves the device, so keep it rather than lose the
          // reference, but say its location metadata is still in it.
          photoMetadataKept: picked !== null && shrunk === null,
        });
      }
    })();
    await photoInFlight;
  }

  function handlePhotoRemove(): void {
    const editor = openEditor();

    if (editor) {
      patchEditor(editor.session, {
        draft: { ...editor.draft, photoFile: null },
        photoMetadataKept: false,
      });
    }
  }

  async function handleCaptureLocation(): Promise<void> {
    const editor = openEditor();

    if (!editor) {
      return;
    }

    const { session } = editor;
    patchEditor(session, { geoStatus: "capturing" });

    try {
      const coords = await captureCoords();
      const current = openEditor(session);

      if (current) {
        patchEditor(
          session,
          coords
            ? { draft: { ...current.draft, coords }, geoStatus: "idle" }
            : { geoStatus: "error" },
        );
      }
    } catch {
      patchEditor(session, { geoStatus: "error" });
    }
  }

  // Settings apply as you change them: there is no Save step. The draft stays
  // the UI's source of truth (a half-typed preset label is blank there but
  // dropped by normalization), the config gets the sanitized view.
  function handleStationChange(updater: SetStateAction<StationSettingsDraft>): void {
    const current = overlay.value;

    if (current.kind !== "station-settings") {
      return;
    }

    const draft = applyUpdate(updater, current.draft);
    overlay.value = { ...current, draft };
    data.value = updateStationConfig(data.value, draft);
  }

  async function handleClearCurrent(): Promise<void> {
    const next = clearCurrentLocation(data.value);
    closeOverlay();
    notice.value = { text: t.value.noticeCollected };
    await commitData(next);
  }

  // Removing a recent spot can be undone for UNDO_WINDOW_MS. Its photo stays
  // stored until then, so undo brings it back whole. A reload in the window
  // leaves the photo to the load-time sweep.
  function handleRemoveRecent(id: string): void {
    const record = data.value.recent.find((entry) => entry.id === id);

    if (!record) {
      return;
    }

    settleRemoval();
    const before = data.value;
    const after = removeRecentLocation(before, id);
    const posted: Notice = {
      text: t.value.noticeRecentRemoved,
      undo: () => {
        if (pendingRemoval?.notice !== posted) {
          return;
        }

        // Anything else that changed the data since ends the window.
        if (data.value !== after) {
          settleRemoval();
          return;
        }

        clearTimeout(pendingRemoval.timer);
        pendingRemoval = null;
        notice.value = { text: t.value.noticeRecentRestored };
        data.value = before;
      },
    };

    openOverlay({ kind: "recent-list" });
    // Notice before data, so a failed save in the persistence effect replaces it.
    notice.value = posted;
    data.value = after;
    pendingRemoval = { record, notice: posted, timer: setTimeout(settleRemoval, UNDO_WINDOW_MS) };
  }

  // Ends the undo window: hides the undo and deletes the removed spot's photo.
  function settleRemoval(): void {
    if (!pendingRemoval) {
      return;
    }

    const { record, notice: posted, timer } = pendingRemoval;
    pendingRemoval = null;
    clearTimeout(timer);

    if (notice.value === posted) {
      notice.value = null;
    }

    // A failed save leaves the record on disk; keep its photo with it.
    if (lastSaveOk) {
      // biome-ignore lint/complexity/noVoid: best-effort cleanup, never rejects
      void repo.dropUnusedPhotos({ ...data.value, current: null, recent: [record] }, data.value);
    }
  }

  async function handleUseRecent(id: string): Promise<void> {
    const next = promoteRecentLocation(data.value, id);

    // Close before committing: commitData removes the previewed entry from
    // `recent`, which would leave the still-open preview sheet rendering nothing
    // while the async blob cleanup runs.
    closeOverlay();
    notice.value = { text: t.value.noticeLocationFromRecent };
    await commitData(next);
  }

  async function handleClearAllData(): Promise<void> {
    // biome-ignore lint/suspicious/noAlert: a native confirm is the honest guard for a one-off destructive action
    if (!window.confirm(t.value.clearAllDataConfirm)) {
      return;
    }

    closeOverlay();
    discardDraft();
    // Notice before data, so a failed save in the persistence effect replaces it.
    notice.value = { text: t.value.noticeDataCleared };
    data.value = defaultAppData;

    // A failed save leaves the old records on disk; keep their photos with them.
    if (lastSaveOk) {
      ignoreFailure(() => repo.clearUnreadableBackup());
      unreadableBackup.value = repo.loadUnreadableBackup();
      await repo.clearPhotos().catch(() => undefined);
    }
  }

  function handleExportSpots(): void {
    downloadFile(exportSpots(data.value), "application/json", `bikespot-${today()}.json`);
  }

  // Plain text: the copy is whatever was stored, often not valid JSON.
  function handleExportUnreadable(): void {
    if (unreadableBackup.value !== null) {
      downloadFile(unreadableBackup.value, "text/plain", `bikespot-unreadable-${today()}.txt`);
    }
  }

  async function handleClearUnreadable(): Promise<void> {
    // biome-ignore lint/suspicious/noAlert: a native confirm is the honest guard for a one-off destructive action
    if (!window.confirm(t.value.clearUnreadableConfirm)) {
      return;
    }

    ignoreFailure(() => repo.clearUnreadableBackup());
    unreadableBackup.value = repo.loadUnreadableBackup();

    // The photos only the copy referred to are unused now.
    if (unreadableBackup.value === null) {
      await sweepPhotos();
    }
  }

  async function handleImportSpots(event: TargetedEvent<HTMLInputElement>): Promise<void> {
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
    // Notice before data, so a failed save in the persistence effect replaces it.
    // commitData also drops the photos of spots the import pushed out of Recent.
    notice.value = { text: t.value.noticeImported(result.added) };
    await commitData(result.data);
  }

  return {
    data,
    overlay,
    notice,
    unreadableBackup,
    start,
    openOverlay,
    closeOverlay,
    setLocationDraft,
    toggleEditorDetails,
    handleLocationSubmit,
    handlePhotoChange,
    handlePhotoRemove,
    handleCaptureLocation,
    handleStationChange,
    handleClearCurrent,
    handleRemoveRecent,
    handleUseRecent,
    handleClearAllData,
    handleExportSpots,
    handleExportUnreadable,
    handleClearUnreadable,
    handleImportSpots,
  };
}

function lostDataNotice(lost: LoadLoss): Notice | null {
  if (!lost) {
    return null;
  }

  return {
    text: lost === "all" ? t.value.noticeDataUnreadable : t.value.noticeSomeDataUnreadable,
    tone: "error",
  };
}

function downloadFile(text: string, type: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function whyNotSavable(draft: LocationDraft, station: StationConfig): string {
  const laneMissing = draft.kind === "station" && station.enabledFields.lane && !draft.lane.trim();
  return laneMissing ? t.value.errorLaneRequired : t.value.errorNothingToFindBy;
}

function applyUpdate<T>(updater: SetStateAction<T>, previous: T): T {
  return typeof updater === "function" ? (updater as (previous: T) => T)(previous) : updater;
}

// Draft writes are a convenience: a full or blocked storage must not break editing.
function ignoreFailure(write: () => void): void {
  try {
    write();
  } catch {
    // Nothing to tell the user; the edit itself is still in memory.
  }
}
