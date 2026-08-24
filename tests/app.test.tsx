import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../src/App.tsx";
import { hydrated } from "../src/lib/store.ts";
import { seedStorage } from "./fixtures.ts";

// Hydration from storage is async; wait for the seeded sign before interacting.
async function renderApp() {
  render(<App />);
  await screen.findByRole("heading", { name: /lane 4/i });
}

// The sheet takes focus in a mount effect; typing before that lands on the
// dialog instead of the input.
async function openSheet(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole("button", { name }));
  await waitFor(() => expect(screen.getByRole("dialog")).toHaveFocus());
}

describe("bike storage tracker app", () => {
  beforeEach(() => {
    window.localStorage.clear();
    seedStorage();
  });

  it("renders the current spot card and navigation", async () => {
    await renderApp();

    const currentSpotCard = screen.getByRole("region", {
      name: /current spot/i,
    });
    const navigation = screen.getByRole("navigation", { name: /more/i });

    expect(currentSpotCard).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change location/i })).toBeInTheDocument();
    expect(
      within(currentSpotCard).getByRole("button", { name: /view details/i }),
    ).toBeInTheDocument();
    expect(
      within(navigation).getByRole("button", { name: /recent locations/i }),
    ).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: /^settings$/i })).toBeInTheDocument();
  });

  it("starts honest on first run: no spot, no fake history, one clear action", async () => {
    window.localStorage.clear();
    const user = userEvent.setup();

    render(<App />);
    await waitFor(() => expect(hydrated.value).toBe(true));

    const currentSpotCard = screen.getByRole("region", { name: /current spot/i });
    expect(
      await within(currentSpotCard).findByRole("heading", { name: /no bike parked/i }),
    ).toBeVisible();
    expect(within(currentSpotCard).queryByRole("button", { name: /view details/i })).toBeNull();
    expect(screen.getByText("0")).toBeInTheDocument();

    await openSheet(user, /save my spot/i);
    await user.type(screen.getByLabelText(/^lane$/i), "7");
    await user.click(screen.getByRole("button", { name: /save location/i }));

    expect(screen.getByRole("heading", { name: /lane 7/i })).toBeInTheDocument();
    expect(screen.getByText(/^spot saved$/i)).toBeInTheDocument();
  });

  it("explains what is missing instead of silently ignoring Save", async () => {
    const user = userEvent.setup();

    await renderApp();

    await openSheet(user, /change location/i);
    await user.click(screen.getByRole("button", { name: /save location/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/enter the lane/i);
    expect(screen.getByLabelText(/^lane$/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("dialog", { name: /change location/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /parked outside/i }));
    await user.click(screen.getByRole("button", { name: /save location/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/add a note, photo or gps/i);
  });

  it("marks the bike as collected from the details sheet and keeps the spot in recent", async () => {
    const user = userEvent.setup();

    await renderApp();

    await user.click(screen.getByRole("button", { name: /view details/i }));
    await user.click(screen.getByRole("button", { name: /bike collected/i }));

    expect(screen.getByRole("heading", { name: /no bike parked/i })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows the enabled fields as labeled facts on the current spot card", async () => {
    await renderApp();

    const currentSpotCard = screen.getByRole("region", { name: /current spot/i });
    expect(within(currentSpotCard).getByText(/middle distance/i)).toBeInTheDocument();
    expect(within(currentSpotCard).getByText(/right side/i)).toBeInTheDocument();
    expect(within(currentSpotCard).getByText(/bottom rack/i)).toBeInTheDocument();
  });

  it("auto-dismisses the status notice after a delay", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    try {
      await renderApp();

      // Fake timers stall waitFor, so flush the sheet's focus effect by hand.
      await user.click(screen.getByRole("button", { name: /change location/i }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await user.type(screen.getByLabelText(/^lane$/i), "7");
      await user.click(screen.getByRole("button", { name: /save location/i }));

      expect(screen.getByText(/spot saved/i)).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4100);
      });

      expect(screen.queryByText(/spot saved/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses station settings to drive the location editor fields", async () => {
    const user = userEvent.setup();

    await renderApp();

    await openSheet(user, /^settings$/i);

    await user.click(screen.getByRole("button", { name: /preset lanes/i }));
    await user.clear(screen.getByLabelText(/^lane 1$/i));
    await user.type(screen.getByLabelText(/^lane 1$/i), "4");
    await user.clear(screen.getByLabelText(/^lane 2$/i));
    await user.type(screen.getByLabelText(/^lane 2$/i), "5");
    await user.clear(screen.getByLabelText(/^lane 3$/i));
    await user.type(screen.getByLabelText(/^lane 3$/i), "6");
    await user.click(screen.getByRole("checkbox", { name: /side/i }));
    await user.keyboard("{Escape}");

    await openSheet(user, /change location/i);

    expect(screen.getByRole("button", { name: /^lane 4$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^lane 5$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^lane 6$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /side left/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /distance close/i })).not.toBeInTheDocument();
  });

  it("keeps GPS under More details for station mode but shows it by default outside", async () => {
    const user = userEvent.setup();

    await renderApp();

    await openSheet(user, /change location/i);

    // Station mode: GPS capture lives in the collapsed More details panel.
    expect(screen.queryByRole("button", { name: /use my location/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /more details/i }));
    expect(screen.getByRole("button", { name: /use my location/i })).toBeInTheDocument();

    // Outside mode: GPS capture is shown by default.
    await user.click(screen.getByRole("button", { name: /parked outside/i }));
    expect(screen.getByRole("button", { name: /use my location/i })).toBeInTheDocument();
  });

  it("saves an outside location and shows its notes and photo in details", async () => {
    const user = userEvent.setup();

    await renderApp();

    await openSheet(user, /change location/i);
    await user.click(screen.getByRole("button", { name: /parked outside/i }));
    await user.upload(
      screen.getByLabelText(/photo/i),
      new File(["outside"], "outside.png", { type: "image/png" }),
    );
    await user.type(screen.getByLabelText(/notes/i), "At the fence near the station exit");
    await user.click(screen.getByRole("button", { name: /save location/i }));

    expect(screen.getByText(/outside the station/i)).toBeInTheDocument();
    expect(screen.getByText(/at the fence near the station exit/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /view details/i }));

    const detailsSheet = screen.getByRole("dialog", {
      name: /location details/i,
    });
    expect(
      within(detailsSheet).getByText(/at the fence near the station exit/i),
    ).toBeInTheDocument();
    expect(await within(detailsSheet).findByAltText(/saved bike reference/i)).toBeInTheDocument();
  });

  it("previews an added photo in the editor and removes it again", async () => {
    const user = userEvent.setup();

    await renderApp();

    await openSheet(user, /change location/i);
    await user.click(screen.getByRole("button", { name: /parked outside/i }));

    const editorSheet = screen.getByRole("dialog", { name: /change location/i });
    expect(within(editorSheet).queryByRole("button", { name: /remove photo/i })).toBeNull();

    await user.upload(
      within(editorSheet).getByLabelText(/photo/i),
      new File(["outside"], "outside.png", { type: "image/png" }),
    );

    expect(await within(editorSheet).findByAltText(/bike reference preview/i)).toBeInTheDocument();
    expect(within(editorSheet).getByText(/replace photo/i)).toBeInTheDocument();

    await user.click(within(editorSheet).getByRole("button", { name: /remove photo/i }));

    await waitFor(() => {
      expect(within(editorSheet).queryByAltText(/bike reference preview/i)).toBeNull();
    });
    expect(within(editorSheet).getByText(/add a photo/i)).toBeInTheDocument();
  });

  it("opens recent locations in a preview flow and only promotes after confirmation", async () => {
    const user = userEvent.setup();

    await renderApp();

    await openSheet(user, /change location/i);
    await user.clear(screen.getByLabelText(/^lane$/i));
    await user.type(screen.getByLabelText(/^lane$/i), "5");
    await user.click(screen.getByRole("button", { name: /save location/i }));

    await openSheet(user, /recent locations/i);
    await user.click(
      screen.getByRole("button", {
        name: /restore lane 4 from recent locations/i,
      }),
    );

    expect(screen.getByRole("dialog", { name: /recent location preview/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /use this location/i }));

    expect(screen.getByRole("heading", { name: /lane 4/i })).toBeInTheDocument();
  });

  it("keeps the saved visible fields on recent entries after station settings change", async () => {
    const user = userEvent.setup();

    await renderApp();

    await openSheet(user, /^settings$/i);
    await user.click(screen.getByRole("checkbox", { name: /side/i }));
    await user.keyboard("{Escape}");

    await openSheet(user, /change location/i);
    await user.clear(screen.getByLabelText(/^lane$/i));
    await user.type(screen.getByLabelText(/^lane$/i), "5");
    await user.click(screen.getByRole("button", { name: /side left/i }));
    await user.click(screen.getByRole("button", { name: /save location/i }));

    await openSheet(user, /^settings$/i);
    await user.click(screen.getByRole("checkbox", { name: /side/i }));
    await user.click(screen.getByRole("checkbox", { name: /floor/i }));
    await user.keyboard("{Escape}");

    await openSheet(user, /recent locations/i);
    await user.click(
      screen.getByRole("button", {
        name: /restore lane 4 from recent locations/i,
      }),
    );

    const previewSheet = screen.getByRole("dialog", { name: /recent location preview/i });
    expect(within(previewSheet).getByText(/^side$/i)).toBeInTheDocument();
    expect(within(previewSheet).getAllByText(/^right$/i).length).toBeGreaterThan(0);
  });

  it("closes sheets when the user clicks the dialog backdrop", async () => {
    const user = userEvent.setup();

    await renderApp();
    const currentSpotCard = screen.getByRole("region", { name: /current spot/i });

    // Clicking the backdrop hit target (behind the sheet) returns to main.
    const clickBackdrop = (name: RegExp) => {
      const overlay = screen.getByRole("dialog", { name }).parentElement;
      const hit = overlay?.querySelector(".sheet-overlay__hit");
      if (hit) {
        fireEvent.click(hit);
      }
    };

    await openSheet(user, /change location/i);
    clickBackdrop(/change location/i);
    expect(screen.queryByRole("heading", { name: /change location/i })).not.toBeInTheDocument();

    await openSheet(user, /recent locations/i);
    clickBackdrop(/recent locations/i);
    expect(screen.queryByRole("heading", { name: /recent locations/i })).not.toBeInTheDocument();

    await user.click(within(currentSpotCard).getByRole("button", { name: /view details/i }));
    clickBackdrop(/location details/i);
    expect(screen.queryByRole("heading", { name: /location details/i })).not.toBeInTheDocument();
  });
});
