import type { TargetedEvent } from "preact";
import { beforeEach, describe, expect, it } from "vitest";
import { createLocationDraft, createStationSettingsDraft } from "../src/lib/drafts.ts";
import { createStore, type Store } from "../src/lib/store.ts";
import { editorOf, sampleAppData, seedStorage } from "./fixtures.ts";

const submitEvent = {
  preventDefault: () => undefined,
} as unknown as TargetedEvent<HTMLFormElement>;

describe("overlay state", () => {
  let store: Store;

  beforeEach(() => {
    window.localStorage.clear();
    seedStorage();
    store = createStore();
  });

  it("opens the editor with a fresh draft and nothing left over", () => {
    store.openOverlay({ kind: "edit-location" });

    expect(store.overlay.value).toEqual({
      kind: "edit-location",
      draft: createLocationDraft(sampleAppData.current, sampleAppData.station),
      showDetails: false,
      error: null,
      geoStatus: "idle",
      photoMetadataKept: false,
      session: expect.any(Number),
    });
  });

  it("opens station settings with a copy of the station config", () => {
    store.openOverlay({ kind: "station-settings" });

    expect(store.overlay.value).toEqual({
      kind: "station-settings",
      draft: createStationSettingsDraft(sampleAppData.station),
    });
  });

  it("opens overlays without state as asked", () => {
    const id = sampleAppData.recent[0]!.id;

    store.openOverlay({ kind: "recent-preview", id });
    expect(store.overlay.value).toEqual({ kind: "recent-preview", id });

    store.closeOverlay();
    expect(store.overlay.value).toEqual({ kind: "closed" });
  });

  it("starts every editor opening clean, whatever the last one left", async () => {
    store.openOverlay({ kind: "edit-location" });
    store.toggleEditorDetails();
    store.setLocationDraft((draft) => ({ ...draft, lane: "" }));
    await store.handleLocationSubmit(submitEvent);
    const first = editorOf(store);
    expect(first.error).not.toBeNull();
    expect(first.showDetails).toBe(true);

    store.closeOverlay();
    store.openOverlay({ kind: "edit-location" });
    const second = editorOf(store);

    expect(second.error).toBeNull();
    expect(second.showDetails).toBe(false);
    expect(second.session).not.toBe(first.session);
  });

  it("drops the editor's state when another overlay opens", () => {
    store.openOverlay({ kind: "edit-location" });
    store.setLocationDraft((draft) => ({ ...draft, lane: "9" }));

    store.openOverlay({ kind: "recent-list" });
    expect(store.overlay.value).toEqual({ kind: "recent-list" });

    store.openOverlay({ kind: "edit-location" });
    expect(editorOf(store).draft).toMatchObject({ lane: "" });
  });

  it("keeps the session across edits within one opening", () => {
    store.openOverlay({ kind: "edit-location" });
    const { session } = editorOf(store);

    store.setLocationDraft((draft) => ({ ...draft, lane: "9" }));
    store.toggleEditorDetails();
    store.handlePhotoRemove();

    expect(editorOf(store).session).toBe(session);
    expect(editorOf(store).draft).toMatchObject({ lane: "9" });
  });

  it("closes the editor after a successful save", async () => {
    store.openOverlay({ kind: "edit-location" });
    store.setLocationDraft((draft) => ({ ...draft, lane: "9" }));

    await store.handleLocationSubmit(submitEvent);

    expect(store.overlay.value).toEqual({ kind: "closed" });
    expect(store.data.value.current).toMatchObject({ lane: "9" });
  });

  it("keeps two stores apart", () => {
    const other = createStore();
    store.openOverlay({ kind: "edit-location" });

    expect(other.overlay.value).toEqual({ kind: "closed" });
  });
});
