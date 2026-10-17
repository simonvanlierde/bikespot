import { beforeEach, describe, expect, it } from "vitest";

import type { StationLocationDraft } from "../src/lib/drafts.ts";
import {
  clearDraft,
  DRAFT_MAX_AGE_MS,
  DRAFT_STORAGE_KEY,
  loadDraft,
  saveDraft,
} from "../src/lib/repository.ts";
import { createStore, type Store } from "../src/lib/store.ts";
import { editorOf } from "./fixtures.ts";

const draft: StationLocationDraft = {
  kind: "station",
  lane: "12",
  side: "left",
  rackLevel: "top",
  distance: "far",
  floor: "2",
  rackNumber: "R9",
  notes: "by the pillar",
  photoFile: null,
  coords: { lat: 52.08, lng: 4.32 },
};

// One page load: a fresh store, started as App does on mount.
function load(): { store: Store; stop: () => void } {
  const store = createStore();
  return { store, stop: store.start() };
}

// What a user typing into the open editor amounts to.
function type(store: Store, typed: StationLocationDraft, showDetails = false) {
  store.setLocationDraft(typed);
  if (showDetails) {
    store.toggleEditorDetails();
  }
}

describe("draft storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips an in-progress edit", () => {
    saveDraft(draft, true);

    expect(loadDraft()).toEqual({ draft, showDetails: true });
  });

  it("drops a pending photo, which cannot be serialized", () => {
    const photoFile = new File(["x"], "spot.jpg", { type: "image/jpeg" });
    saveDraft({ ...draft, photoFile }, false);

    const stored = loadDraft();

    expect(stored?.draft.photoFile).toBeNull();
    expect(stored?.draft).toMatchObject({ lane: "12" });
  });

  it("ignores a draft old enough to belong to another trip", () => {
    saveDraft(draft, false);

    expect(loadDraft(Date.now() + DRAFT_MAX_AGE_MS + 1000)).toBeNull();
    expect(loadDraft(Date.now() + DRAFT_MAX_AGE_MS - 1000)).not.toBeNull();
  });

  it("ignores malformed, undated, and unknown-mode drafts", () => {
    const cases = [
      "not json",
      JSON.stringify({ draft: { kind: "station" } }),
      JSON.stringify({ draft: { kind: "elsewhere" }, savedAt: new Date().toISOString() }),
      JSON.stringify({ savedAt: new Date().toISOString() }),
    ];

    const results = cases.map((raw) => {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, raw);
      return loadDraft();
    });

    expect(results).toEqual(cases.map(() => null));
  });

  it("clears the stored draft", () => {
    saveDraft(draft, false);
    clearDraft();

    expect(loadDraft()).toBeNull();
  });
});

describe("draft restore through the store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps the editor's work when the page reloads mid-edit", () => {
    const first = load();
    first.store.openOverlay({ kind: "edit-location" });
    type(first.store, draft, true);
    first.stop();

    // A reload: nothing was cancelled or saved, so the draft survives.
    const second = load();
    second.store.openOverlay({ kind: "edit-location" });

    expect(editorOf(second.store).draft).toMatchObject({ lane: "12", notes: "by the pillar" });
    expect(editorOf(second.store).showDetails).toBe(true);
    second.stop();
  });

  it("restores the draft only once, then starts fresh", () => {
    const first = load();
    first.store.openOverlay({ kind: "edit-location" });
    type(first.store, draft);
    first.stop();

    const { store, stop } = load();
    store.openOverlay({ kind: "edit-location" });
    store.closeOverlay();
    store.openOverlay({ kind: "edit-location" });

    expect(editorOf(store).draft).toMatchObject({ lane: "", notes: "" });
    stop();
  });

  it("discards the draft once the editor is closed", () => {
    const { store, stop } = load();
    store.openOverlay({ kind: "edit-location" });
    type(store, draft);
    store.closeOverlay();

    expect(loadDraft()).toBeNull();
    stop();
  });

  it("writes nothing to disk before the store is started", () => {
    const store = createStore();
    store.openOverlay({ kind: "edit-location" });
    type(store, draft);

    expect(loadDraft()).toBeNull();
  });
});
