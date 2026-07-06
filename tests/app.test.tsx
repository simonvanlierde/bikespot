import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../src/App.tsx";

describe("bike storage tracker app", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the current spot card and quick actions", () => {
    render(<App />);

    const currentSpotCard = screen.getByRole("region", {
      name: /current spot/i,
    });
    const quickActions = screen.getByRole("region", { name: /quick actions/i });

    expect(currentSpotCard).toBeInTheDocument();
    expect(quickActions).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change location/i })).toBeInTheDocument();
    expect(
      within(currentSpotCard).getByRole("button", { name: /view details/i }),
    ).toBeInTheDocument();
    expect(
      within(quickActions).getByRole("button", { name: /recent locations/i }),
    ).toBeInTheDocument();
    expect(within(quickActions).getByRole("button", { name: /^settings$/i })).toBeInTheDocument();
  });

  it("shows the enabled fields as labeled facts on the current spot card", () => {
    render(<App />);

    const currentSpotCard = screen.getByRole("region", { name: /current spot/i });
    expect(within(currentSpotCard).getByText(/middle distance/i)).toBeInTheDocument();
    expect(within(currentSpotCard).getByText(/right side/i)).toBeInTheDocument();
    expect(within(currentSpotCard).getByText(/bottom rack/i)).toBeInTheDocument();
  });

  it("auto-dismisses the status notice after a delay", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    try {
      render(<App />);

      await user.click(screen.getByRole("button", { name: /change location/i }));
      await user.click(screen.getByRole("button", { name: /save location/i }));

      expect(screen.getByText(/location updated/i)).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4100);
      });

      expect(screen.queryByText(/location updated/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses station settings to drive the location editor fields", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /^settings$/i }));

    await user.click(screen.getByRole("button", { name: /quick lanes/i }));
    await user.clear(screen.getByLabelText(/^lane 1$/i));
    await user.type(screen.getByLabelText(/^lane 1$/i), "4");
    await user.clear(screen.getByLabelText(/^lane 2$/i));
    await user.type(screen.getByLabelText(/^lane 2$/i), "5");
    await user.clear(screen.getByLabelText(/^lane 3$/i));
    await user.type(screen.getByLabelText(/^lane 3$/i), "6");
    await user.click(screen.getByRole("checkbox", { name: /side/i }));
    await user.click(screen.getByRole("button", { name: /save station settings/i }));

    await user.click(screen.getByRole("button", { name: /change location/i }));

    expect(screen.getByRole("button", { name: /^lane 4$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^lane 5$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^lane 6$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /side left/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /distance close/i })).not.toBeInTheDocument();
  });

  it("keeps GPS under More details for station mode but shows it by default outside", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /change location/i }));

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

    render(<App />);

    await user.click(screen.getByRole("button", { name: /change location/i }));
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

    render(<App />);

    await user.click(screen.getByRole("button", { name: /change location/i }));
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

    render(<App />);

    await user.click(screen.getByRole("button", { name: /change location/i }));
    await user.clear(screen.getByLabelText(/^lane$/i));
    await user.type(screen.getByLabelText(/^lane$/i), "5");
    await user.click(screen.getByRole("button", { name: /save location/i }));

    await user.click(screen.getByRole("button", { name: /recent locations/i }));
    await user.click(
      screen.getByRole("button", {
        name: /restore lane 4 from recent locations/i,
      }),
    );

    expect(screen.getByRole("dialog", { name: /recent location preview/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /use this location/i }));

    expect(screen.getByText(/lane 4/i)).toBeInTheDocument();
  });

  it("keeps the saved visible fields on recent entries after station settings change", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /^settings$/i }));
    await user.click(screen.getByRole("checkbox", { name: /side/i }));
    await user.click(screen.getByRole("button", { name: /save station settings/i }));

    await user.click(screen.getByRole("button", { name: /change location/i }));
    await user.clear(screen.getByLabelText(/^lane$/i));
    await user.type(screen.getByLabelText(/^lane$/i), "5");
    await user.click(screen.getByRole("button", { name: /side left/i }));
    await user.click(screen.getByRole("button", { name: /save location/i }));

    await user.click(screen.getByRole("button", { name: /^settings$/i }));
    await user.click(screen.getByRole("checkbox", { name: /side/i }));
    await user.click(screen.getByRole("checkbox", { name: /floor/i }));
    await user.click(screen.getByRole("button", { name: /save station settings/i }));

    await user.click(screen.getByRole("button", { name: /recent locations/i }));
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

    render(<App />);
    const currentSpotCard = screen.getByRole("region", { name: /current spot/i });

    // Clicking the backdrop hit target (behind the sheet) returns to main.
    const clickBackdrop = (name: RegExp) => {
      const overlay = screen.getByRole("dialog", { name }).parentElement;
      const hit = overlay?.querySelector(".sheet-overlay__hit");
      if (hit) {
        fireEvent.click(hit);
      }
    };

    await user.click(screen.getByRole("button", { name: /change location/i }));
    clickBackdrop(/change location/i);
    expect(screen.queryByRole("heading", { name: /change location/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /recent locations/i }));
    clickBackdrop(/recent locations/i);
    expect(screen.queryByRole("heading", { name: /recent locations/i })).not.toBeInTheDocument();

    await user.click(within(currentSpotCard).getByRole("button", { name: /view details/i }));
    clickBackdrop(/location details/i);
    expect(screen.queryByRole("heading", { name: /location details/i })).not.toBeInTheDocument();
  });
});
