import { render, screen, waitFor, within } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import App from "../src/App.tsx";
import { joinFacts } from "../src/features/location/display.ts";
import { t } from "../src/lib/i18n.ts";
import { createStore } from "../src/lib/store.ts";
import { sampleAppData, seedStorage } from "./fixtures.ts";

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

async function renderSeeded(user: ReturnType<typeof userEvent.setup>) {
  const [previous] = sampleAppData.recent;
  seedStorage({
    ...sampleAppData,
    current: { ...sampleAppData.current!, updatedAt: hoursAgo(2), coords: { lat: 52, lng: 5, accuracy: 10 } },
    recent: [{ ...previous!, updatedAt: hoursAgo(5), coords: { lat: 52, lng: 5 } }],
  });
  render(<App store={createStore()} />);
  await screen.findByRole("heading", { name: /lane 4/i });
  return user;
}

async function openSheet(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole("button", { name }));
  await waitFor(() => expect(screen.getByRole("dialog")).toHaveFocus());
}

describe("separators", () => {
  it("glues each dot to the fact before it, so a wrapped line never starts with one", () => {
    expect(joinFacts(["Floor 1", "Middle distance", "Top rack"])).toBe("Floor 1 · Middle distance · Top rack");
    expect(joinFacts(["Floor 1"])).toBe("Floor 1");
  });
});

describe("names and timestamps", () => {
  beforeEach(() => window.localStorage.clear());

  it("names the details button after the spot and the GPS pin as an image", async () => {
    await renderSeeded(userEvent.setup());
    const card = screen.getByRole("region", { name: /current spot/i });

    expect(within(card).getByRole("button", { name: `${t.value.viewDetails}: Lane 4` })).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: t.value.hasGps })).toBeInTheDocument();
  });

  it("tells the user a Maps link opens a new window", async () => {
    await renderSeeded(userEvent.setup());
    const card = screen.getByRole("region", { name: /current spot/i });

    expect(
      within(card).getByRole("link", { name: new RegExp(`${t.value.openInMaps}\\s*\\(opens in a new window\\)`) }),
    ).toBeInTheDocument();
  });

  it("uses the same relative time on the sign, in details, in Recent and in the preview", async () => {
    const user = await renderSeeded(userEvent.setup());
    expect(screen.getByText(t.value.updated("2 hours ago"))).toBeInTheDocument();

    await openSheet(user, /view details/i);
    expect(within(screen.getByRole("dialog")).getByText(t.value.updated("2 hours ago"))).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: t.value.close }));

    await openSheet(user, /recent locations/i);
    expect(within(screen.getByRole("dialog")).getByText("5 hours ago")).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /lane 5/i }));
    expect(screen.getByText(t.value.saved("5 hours ago"))).toBeInTheDocument();
  });
});
