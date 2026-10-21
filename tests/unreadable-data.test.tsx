import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../src/App.tsx";

import { defaultAppData } from "../src/lib/defaults.ts";
import { t } from "../src/lib/i18n.ts";
import { clearPhotoBlobs, listPhotoIds, savePhotoBlob } from "../src/lib/photos.ts";
import { APP_DATA_STORAGE_KEY, browserRepository, UNREADABLE_BACKUP_KEY } from "../src/lib/repository.ts";
import { createStore } from "../src/lib/store.ts";
import { sampleAppData, seedStorage } from "./fixtures.ts";

const corrupt = '{"station":{"name":"My station"},"current":{"id":"a"'; // cut off mid-write

describe("stored data that cannot be read", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await clearPhotoBlobs();
    vi.unstubAllGlobals();
  });

  it("says so and keeps the raw bytes after the next save", () => {
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, corrupt);

    const store = createStore();
    const stop = store.start();

    expect(store.notice.value).toEqual({ text: t.value.noticeDataUnreadable, tone: "error" });
    expect(store.data.value).toEqual(defaultAppData);
    // start() has saved the defaults over the main key by now.
    expect(window.localStorage.getItem(APP_DATA_STORAGE_KEY)).toBe(JSON.stringify(defaultAppData));
    expect(window.localStorage.getItem(UNREADABLE_BACKUP_KEY)).toBe(corrupt);
    stop();
  });

  it("shows no notice and keeps no backup on a first run", () => {
    const store = createStore();
    const stop = store.start();

    expect(store.notice.value).toBeNull();
    expect(window.localStorage.getItem(UNREADABLE_BACKUP_KEY)).toBeNull();
    stop();
  });

  it("shows no notice for data the app wrote itself", () => {
    seedStorage();

    const store = createStore();

    expect(store.notice.value).toBeNull();
    expect(store.data.value).toEqual(sampleAppData);
    expect(window.localStorage.getItem(UNREADABLE_BACKUP_KEY)).toBeNull();
  });

  it("says some spots were dropped when a record cannot be read", () => {
    const raw = JSON.stringify({ ...sampleAppData, recent: [{ id: "broken" }] });
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, raw);

    const store = createStore();

    expect(store.notice.value).toEqual({ text: t.value.noticeSomeDataUnreadable, tone: "error" });
    expect(store.data.value.current).toEqual(sampleAppData.current);
    expect(store.data.value.recent).toEqual([]);
    expect(window.localStorage.getItem(UNREADABLE_BACKUP_KEY)).toBe(raw);
  });

  it("treats a stored value of the wrong shape as unreadable", () => {
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify({ version: 2, state: {} }));

    expect(browserRepository.loadAppData().lost).toBe("all");
  });

  it("does not save over the stored data when the backup cannot be written", () => {
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, corrupt);
    const setItem = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === UNREADABLE_BACKUP_KEY) {
        throw new Error("quota exceeded");
      }
      setItem.call(this, key, value);
    });

    const store = createStore();
    const stop = store.start();
    spy.mockRestore();

    expect(window.localStorage.getItem(APP_DATA_STORAGE_KEY)).toBe(corrupt);
    expect(store.notice.value).toEqual({ text: t.value.noticeSaveFailed, tone: "error" });
    stop();
  });

  it("keeps the photos the backup refers to", async () => {
    const photoId = await savePhotoBlob(new File(["bike"], "bike.png", { type: "image/png" }));
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, `{"current":{"photoId":"${photoId}"`);

    const stop = createStore().start();
    await new Promise((resolve) => setTimeout(resolve, 0)); // let the load-time photo sweep run

    expect(await listPhotoIds()).toEqual([photoId]);
    stop();
  });

  it("removes the backup when all data is cleared", async () => {
    vi.stubGlobal("confirm", () => true);
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, corrupt);
    const store = createStore();
    const stop = store.start();

    await store.handleClearAllData();

    expect(window.localStorage.getItem(UNREADABLE_BACKUP_KEY)).toBeNull();
    stop();
  });

  it("removes the backup when all data is cleared", async () => {
    vi.stubGlobal("confirm", () => true);
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, corrupt);
    const store = createStore();
    const stop = store.start();

    await store.handleClearAllData();

    expect(store.unreadableBackup.value).toBeNull();
    stop();
  });
});

describe("getting the unreadable copy out", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await clearPhotoBlobs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function openSettings() {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^settings$/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveFocus());
  }

  it("offers export and clear in Settings while a copy is kept", async () => {
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, corrupt);
    render(<App store={createStore()} />);

    await openSettings();

    expect(screen.getByRole("button", { name: t.value.exportUnreadable })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.value.clearUnreadable })).toBeInTheDocument();
  });

  it("offers neither when no copy is kept", async () => {
    seedStorage();
    render(<App store={createStore()} />);

    await openSettings();

    expect(screen.queryByRole("button", { name: t.value.exportUnreadable })).toBeNull();
    expect(screen.queryByRole("button", { name: t.value.clearUnreadable })).toBeNull();
  });

  it("downloads exactly the stored text", async () => {
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, corrupt);
    let saved: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      saved = blob as Blob;
      return "blob:unreadable";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const store = createStore();

    store.handleExportUnreadable();

    expect(click).toHaveBeenCalledOnce();
    expect(await saved?.text()).toBe(corrupt);
  });

  it("clears the copy after a confirm, then sweeps the photos it kept", async () => {
    const photoId = await savePhotoBlob(new File(["bike"], "bike.png", { type: "image/png" }));
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, `{"current":{"photoId":"${photoId}"`);
    const store = createStore();
    const stop = store.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await listPhotoIds()).toEqual([photoId]);

    vi.stubGlobal("confirm", () => false);
    await store.handleClearUnreadable();
    expect(window.localStorage.getItem(UNREADABLE_BACKUP_KEY)).not.toBeNull();

    vi.stubGlobal("confirm", () => true);
    await store.handleClearUnreadable();

    expect(window.localStorage.getItem(UNREADABLE_BACKUP_KEY)).toBeNull();
    expect(store.unreadableBackup.value).toBeNull();
    expect(await listPhotoIds()).toEqual([]);
    stop();
  });
});
