import { render, screen, waitFor, within } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import App from "../src/App.tsx";
import { t } from "../src/lib/i18n.ts";
import { createStore } from "../src/lib/store.ts";
import { sampleAppData, seedStorage } from "./fixtures.ts";

// The saved spot is on floor 1; the station's first floor label is G.
async function openEditor(user: ReturnType<typeof userEvent.setup>) {
  render(<App store={createStore()} />);
  await screen.findByRole("heading", { name: /lane 4/i });
  await user.click(screen.getByRole("button", { name: /change spot/i }));
  await waitFor(() => expect(screen.getByRole("dialog")).toHaveFocus());
  return screen.getByRole("dialog");
}

describe("editor values carried from the last spot", () => {
  beforeEach(() => {
    window.localStorage.clear();
    seedStorage({
      ...sampleAppData,
      station: {
        ...sampleAppData.station,
        floorInputMode: "number",
        floorLabels: ["G"],
        enabledFields: { ...sampleAppData.station.enabledFields, floor: true },
      },
    });
  });

  it("labels the carried floor and resets it with one control", async () => {
    const user = userEvent.setup();
    const sheet = await openEditor(user);

    expect(within(sheet).getByLabelText(/^floor$/i)).toHaveValue("1");
    expect(within(sheet).getByText(t.value.sameAsLastTime)).toBeVisible();

    await user.click(within(sheet).getByRole("button", { name: t.value.resetFields }));

    expect(within(sheet).getByLabelText(/^floor$/i)).toHaveValue("G");
    expect(within(sheet).queryByText(t.value.sameAsLastTime)).toBeNull();
    expect(sheet).toHaveFocus();
  });

  it("says nothing once the user changes the floor by hand", async () => {
    const user = userEvent.setup();
    const sheet = await openEditor(user);

    await user.clear(within(sheet).getByLabelText(/^floor$/i));
    await user.type(within(sheet).getByLabelText(/^floor$/i), "3");

    expect(within(sheet).queryByText(t.value.sameAsLastTime)).toBeNull();
  });
});
