import { render, screen, waitFor, within } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../src/App.tsx";
import { t } from "../src/lib/i18n.ts";
import { createStore } from "../src/lib/store.ts";
import { seedStorage } from "./fixtures.ts";

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  render(<App store={createStore()} />);
  await screen.findByRole("heading", { name: /lane 4/i });
  await user.click(screen.getByRole("button", { name: /^settings$/i }));
  await waitFor(() => expect(screen.getByRole("dialog")).toHaveFocus());
  return screen.getByRole("dialog");
}

describe("clearing parking data", () => {
  beforeEach(() => {
    window.localStorage.clear();
    seedStorage();
  });

  it("asks inside the sheet and never opens a native dialog", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    const sheet = await openSettings(user);

    await user.click(within(sheet).getByRole("button", { name: t.value.clearAllData }));

    expect(within(sheet).getByText(t.value.clearAllDataConfirm)).toBeVisible();
    expect(within(sheet).getByRole("button", { name: t.value.cancel })).toHaveFocus();
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /lane 4/i })).toBeInTheDocument();
    confirm.mockRestore();
  });

  it("cancel keeps the data and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const sheet = await openSettings(user);

    await user.click(within(sheet).getByRole("button", { name: t.value.clearAllData }));
    await user.click(within(sheet).getByRole("button", { name: t.value.cancel }));

    expect(within(sheet).queryByText(t.value.clearAllDataConfirm)).toBeNull();
    expect(within(sheet).getByRole("button", { name: t.value.clearAllData })).toHaveFocus();
    expect(screen.getByRole("heading", { name: /lane 4/i })).toBeInTheDocument();
  });

  it("clears after the second tap", async () => {
    const user = userEvent.setup();
    const sheet = await openSettings(user);

    await user.click(within(sheet).getByRole("button", { name: t.value.clearAllData }));
    await user.click(within(sheet).getByRole("button", { name: t.value.clearAllData }));

    await screen.findByText(t.value.noticeDataCleared);
    expect(screen.queryByRole("heading", { name: /lane 4/i })).toBeNull();
  });
});
