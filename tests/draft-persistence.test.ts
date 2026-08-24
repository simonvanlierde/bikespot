import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StationLocationDraft } from "../src/lib/drafts.ts";
import {
  clearDraft,
  DRAFT_MAX_AGE_MS,
  DRAFT_STORAGE_KEY,
  loadDraft,
  saveDraft,
} from "../src/lib/repository.ts";
import {
  closeOverlay,
  hydrated,
  initStore,
  locationDraft,
  openOverlay,
  showEditorDetails,
} from "../src/lib/store.ts";

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

async function hydrate() {
  const stop = initStore();
  await vi.waitFor(() => {
    if (!hydrated.value) {
      throw new Error("still hydrating");
    }
  });
  return stop;
}

describe("draft storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    closeOverlay();
  });

  it("round-trips an in-progress edit", async () => {
    await saveDraft(draft, true);

    await expect(loadDraft()).resolves.toEqual({ draft, showDetails: true });
  });

  it("drops a pending photo, which cannot be serialized", async () => {
    const photoFile = new File(["x"], "spot.jpg", { type: "image/jpeg" });
    await saveDraft({ ...draft, photoFile }, false);

    const stored = await loadDraft();

    expect(stored?.draft.photoFile).toBeNull();
    expect(stored?.draft).toMatchObject({ lane: "12" });
  });

  it("ignores a draft old enough to belong to another trip", async () => {
    await saveDraft(draft, false);

    await expect(loadDraft(Date.now() + DRAFT_MAX_AGE_MS + 1000)).resolves.toBeNull();
    await expect(loadDraft(Date.now() + DRAFT_MAX_AGE_MS - 1000)).resolves.not.toBeNull();
  });

  it("ignores malformed, undated, and unknown-mode drafts", async () => {
    const cases = [
      "not json",
      JSON.stringify({ draft: { kind: "station" } }),
      JSON.stringify({ draft: { kind: "elsewhere" }, savedAt: new Date().toISOString() }),
      JSON.stringify({ savedAt: new Date().toISOString() }),
    ];

    const results = await Promise.all(
      cases.map((raw) => {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, raw);
        return loadDraft();
      }),
    );

    expect(results).toEqual(cases.map(() => null));
  });

  it("clears the stored draft", async () => {
    await saveDraft(draft, false);
    await clearDraft();

    await expect(loadDraft()).resolves.toBeNull();
  });
});

describe("draft restore through the store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    closeOverlay();
  });

  it("keeps the editor's work when the page reloads mid-edit", async () => {
    const stop = await hydrate();
    openOverlay({ kind: "edit-location" });
    locationDraft.value = { ...draft };
    showEditorDetails.value = true;
    stop();

    // A reload: nothing was cancelled or saved, so the draft survives.
    const restart = await hydrate();
    openOverlay({ kind: "edit-location" });

    expect(locationDraft.value).toMatchObject({ lane: "12", notes: "by the pillar" });
    expect(showEditorDetails.value).toBe(true);
    restart();
  });

  it("restores the draft only once, then starts fresh", async () => {
    const stop = await hydrate();
    openOverlay({ kind: "edit-location" });
    locationDraft.value = { ...draft };
    stop();

    const restart = await hydrate();
    openOverlay({ kind: "edit-location" });
    closeOverlay();
    openOverlay({ kind: "edit-location" });

    expect(locationDraft.value).toMatchObject({ lane: "", notes: "" });
    restart();
  });

  it("discards the draft once the editor is closed", async () => {
    const stop = await hydrate();
    openOverlay({ kind: "edit-location" });
    locationDraft.value = { ...draft };
    closeOverlay();

    await expect(loadDraft()).resolves.toBeNull();
    stop();
  });
});
