import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CoordsField } from "../src/components/CoordsField.tsx";
import { usePhotoUrl } from "../src/components/usePhotoUrl.ts";
import { RecentLocationsSheet } from "../src/features/history/RecentLocationsSheet.tsx";
import { StationLocationFields } from "../src/features/location/StationLocationFields.tsx";
import type { StationConfig } from "../src/lib/app-data.ts";
import type { StationLocationDraft } from "../src/lib/drafts.ts";
import { clearPhotoBlobs, savePhotoBlob } from "../src/lib/photos.ts";

const allFieldsStation: StationConfig = {
  name: "My station",
  laneInputMode: "number",
  laneLabels: ["4"],
  floorInputMode: "quick",
  floorLabels: ["G", "1"],
  enabledFields: {
    lane: true,
    side: true,
    rackLevel: true,
    distance: true,
    floor: true,
    rackNumber: true,
  },
};

const draft: StationLocationDraft = {
  kind: "station",
  lane: "4",
  side: "left",
  rackLevel: "top",
  distance: "close",
  floor: "G",
  rackNumber: "R9",
  notes: "",
  photoFile: null,
  coords: null,
};

describe("StationLocationFields", () => {
  it("routes each enabled field's change through updateStationField", () => {
    const update = vi.fn();
    render(
      <StationLocationFields
        formState={draft}
        station={allFieldsStation}
        showDetails={false}
        geoStatus="idle"
        updateStationField={update}
        onNotesChange={() => {}}
        onToggleDetails={() => {}}
        onPhotoChange={() => {}}
        onPhotoRemove={() => {}}
        onCaptureLocation={() => {}}
      />,
    );

    // Floor is a quick-preset button; lane and rack number are text inputs.
    fireEvent.click(screen.getByRole("button", { name: "Floor 1" }));
    fireEvent.input(screen.getByLabelText("Lane"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Distance Far" }));
    fireEvent.click(screen.getByRole("button", { name: "Side Right" }));
    fireEvent.click(screen.getByRole("button", { name: "Rack level Bottom" }));
    fireEvent.input(screen.getByLabelText("Rack number"), { target: { value: "R12" } });

    expect(update).toHaveBeenCalledWith("floor", "1");
    expect(update).toHaveBeenCalledWith("lane", "7");
    expect(update).toHaveBeenCalledWith("distance", "far");
    expect(update).toHaveBeenCalledWith("side", "right");
    expect(update).toHaveBeenCalledWith("rackLevel", "bottom");
    expect(update).toHaveBeenCalledWith("rackNumber", "R12");
  });
});

describe("CoordsField", () => {
  it("shows captured coordinates with accuracy", () => {
    render(
      <CoordsField coords={{ lat: 1, lng: 2, accuracy: 8 }} status="idle" onCapture={() => {}} />,
    );
    expect(screen.getByText(/Captured/)).toHaveTextContent("±8m accuracy");
    expect(screen.getByRole("button", { name: "Update location" })).toBeEnabled();
  });

  it("disables the button and labels it while capturing", () => {
    render(<CoordsField coords={null} status="capturing" onCapture={() => {}} />);
    expect(screen.getByRole("button", { name: "Locating…" })).toBeDisabled();
  });

  it("shows an error message on failure", () => {
    render(<CoordsField coords={null} status="error" onCapture={() => {}} />);
    expect(screen.getByText(/Couldn.t get your location/)).toBeInTheDocument();
  });
});

describe("RecentLocationsSheet", () => {
  it("uses the outside description as the meta line", () => {
    render(
      <RecentLocationsSheet
        recent={[
          {
            id: "o1",
            mode: "outside",
            stationName: "My station",
            outsideDescription: "By the tram stop",
            updatedAt: "2026-04-20T20:00:00.000Z",
          },
        ]}
        onClose={() => {}}
        onPreview={() => {}}
      />,
    );
    expect(screen.getByText("By the tram stop")).toBeInTheDocument();
  });
});

describe("usePhotoUrl", () => {
  const createObjectUrl = vi.fn(() => "blob:x");
  const revokeObjectUrl = vi.fn();

  function Probe({ photoId, photoFile }: { photoId?: string; photoFile?: File | null }) {
    const url = usePhotoUrl(photoId, photoFile);
    return <span data-testid="url">{url ?? "none"}</span>;
  }

  beforeEach(async () => {
    await clearPhotoBlobs();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    createObjectUrl.mockClear();
    revokeObjectUrl.mockClear();
  });

  it("creates an object URL for a pending photo file", () => {
    render(<Probe photoFile={new File(["x"], "a.jpg")} />);
    expect(screen.getByTestId("url")).toHaveTextContent("blob:x");
    expect(createObjectUrl).toHaveBeenCalledOnce();
  });

  it("resolves null when there is no photo", () => {
    render(<Probe />);
    expect(screen.getByTestId("url")).toHaveTextContent("none");
  });

  it("loads a stored blob by id and revokes the URL on unmount", async () => {
    const id = await savePhotoBlob(new File(["x"], "a.jpg"));
    const { unmount } = render(<Probe photoId={id} />);
    expect(await screen.findByText("blob:x")).toBeInTheDocument();
    unmount();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:x");
  });
});
