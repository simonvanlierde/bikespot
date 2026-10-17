import { effect, signal } from "@preact/signals";
import type { TargetedEvent } from "preact";
import type { SetStateAction } from "preact/compat";

import type { AppData, StationConfig } from "./app-data";
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
import { browserRepository, type SpotRepository } from "./repository";
import { exportSpots, mergeSpots, parseSpotsFile } from "./spotsTransfer";

// What a caller asks to open. The store builds any draft the overlay needs.
export type OverlayRequest =
  | { kind: "closed" }
  | { kind: "edit-location" }
  | { kind: "station-settings" }
  | { kind: "location-details" }
  | { kind: "recent-list" }
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

type Notice = { text: string; tone?: "error" };

export type Store = ReturnType<typeof createStore>;

// The app makes one store, and each test can make its own. Creating it reads
// storage synchronously; start() wires persistence and runs the photo sweep.
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: the handlers share the store's closure
export function createStore(repo: SpotRepository = browserRepository) {
  const data = signal<AppData>(repo.loadAppData());
  const overlay = signal<OverlayState>({ kind: "closed" });
  // A fresh object per notice so posting the same text twice still re-arms the
  // auto-dismiss timer keyed on it. Errors stay until dismissed or replaced.
  const notice = signal<Notice | null>(null);

  // A draft left behind by a refresh mid-edit, handed to the next editor open.
  let restoredDraft = repo.loadDraft();
  let editorSessions = 0;
  let persistRequested = false;
  // Whether the last write of app data reached storage. When it did not, the
  // disk still holds the records the in-memory change dropped, photos included.
  let lastSaveOk = true;

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
      stopSaving();
      stopDraftSaving();
    };
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

    const stripped = picked ? await stripPhotoMetadata(picked) : null;
    const current = openEditor(editor.session);

    if (current) {
      patchEditor(current.session, {
        draft: { ...current.draft, photoFile: stripped ?? picked },
        // The photo never leaves the device, so keep it rather than lose the
        // reference, but say its location metadata is still in it.
        photoMetadataKept: picked !== null && stripped === null,
      });
    }
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

  async function handleRemoveRecent(id: string): Promise<void> {
    const next = removeRecentLocation(data.value, id);
    openOverlay({ kind: "recent-list" });
    notice.value = { text: t.value.noticeRecentRemoved };
    await commitData(next);
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
      await repo.clearPhotos().catch(() => undefined);
    }
  }

  function handleExportSpots(): void {
    const blob = new Blob([exportSpots(data.value)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bikespot-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
    notice.value = { text: t.value.noticeImported(result.added) };
    data.value = result.data;
  }

  return {
    data,
    overlay,
    notice,
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
    handleImportSpots,
  };
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
