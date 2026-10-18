import { act, render, screen, within } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import App from "../src/App.tsx";
import type { AppData } from "../src/lib/app-data.ts";
import { lang } from "../src/lib/i18n.ts";
import { createStore } from "../src/lib/store.ts";
import { sampleAppData, seedStorage } from "./fixtures.ts";

const bike = { lat: 52.0894, lng: 5.1101, accuracy: 6 };

// The current spot and the earlier one both have a fix; the earlier one is
// about 40 m due south.
const withCoords: AppData = {
  ...sampleAppData,
  current: sampleAppData.current ? { ...sampleAppData.current, coords: bike } : null,
  recent: sampleAppData.recent.map((entry) => ({
    ...entry,
    coords: { lat: bike.lat - 0.00036, lng: bike.lng },
  })),
};

// 85 m south and 85 m west of the bike: about 120 m, so the bike is north-east.
const youSouthWest = { lat: bike.lat - 85 / 111_195, lng: bike.lng - 85 / 68_459 };

function position(coords: { lat: number; lng: number }): GeolocationPosition {
  return {
    coords: { latitude: coords.lat, longitude: coords.lng, accuracy: 5 },
  } as GeolocationPosition;
}

function mockGeolocation() {
  let report: PositionCallback = () => undefined;
  let fail: PositionErrorCallback = () => undefined;
  const watchPosition = vi.fn((success: PositionCallback, error: PositionErrorCallback) => {
    report = success;
    fail = error;
    return 7;
  });
  const clearWatch = vi.fn();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: vi.fn(), watchPosition, clearWatch },
  });
  return {
    watchPosition,
    clearWatch,
    move: (coords: typeof bike) => act(() => report(position(coords))),
    fail: (code: number) => act(() => fail({ code } as GeolocationPositionError)),
  };
}

async function openMap() {
  const user = userEvent.setup();
  const view = render(<App store={createStore()} />);
  await user.click(screen.getByRole("button", { name: "Spot map" }));
  return { user, view, dialog: screen.getByRole("dialog", { name: "Spot map" }) };
}

describe("spot map", () => {
  beforeEach(() => {
    window.localStorage.clear();
    lang.value = "en";
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "geolocation");
  });

  it("says so plainly when no spot has a GPS fix", async () => {
    seedStorage();
    const { dialog } = await openMap();

    expect(within(dialog).getByText(/None of your spots has a GPS location/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("img")).toBeNull();
  });

  it("draws the spots and asks for location only on a tap", async () => {
    seedStorage(withCoords);
    const geo = mockGeolocation();
    const { dialog } = await openMap();

    expect(within(dialog).getByRole("img", { name: "Map of 2 spots" })).toBeInTheDocument();
    expect(within(dialog).getByText("Lane 5: 40 m south of the current spot")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Open in Maps/ })).toHaveAttribute(
      "href",
      expect.stringContaining("52.0894,5.1101"),
    );
    expect(geo.watchPosition).not.toHaveBeenCalled();
  });

  it("gives the distance and direction to the bike and updates as you move", async () => {
    seedStorage(withCoords);
    const geo = mockGeolocation();
    const { user, view, dialog } = await openMap();

    await user.click(within(dialog).getByRole("button", { name: "Show where I am" }));
    // Effects run after paint, so the watch starts a moment after the tap.
    await vi.waitFor(() => expect(geo.watchPosition).toHaveBeenCalledTimes(1));
    expect(within(dialog).getByText("Finding your location…")).toBeInTheDocument();

    geo.move({ ...youSouthWest, accuracy: 5 });
    expect(within(dialog).getByText("120 m north-east")).toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: "Map of 2 spots" })).toBeInTheDocument();
    expect(within(dialog).getByText("You")).toBeInTheDocument();
    expect((await axe(view.container)).violations).toEqual([]);

    geo.move({ ...bike, lat: bike.lat + 0.00002 });
    expect(within(dialog).getByText("You are at your bike")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await vi.waitFor(() => expect(geo.clearWatch).toHaveBeenCalledWith(7));
  });

  it("speaks Dutch", async () => {
    lang.value = "nl";
    seedStorage(withCoords);
    const geo = mockGeolocation();
    const user = userEvent.setup();
    render(<App store={createStore()} />);
    await user.click(screen.getByRole("button", { name: "Plekkenkaart" }));
    await user.click(screen.getByRole("button", { name: "Laat zien waar ik ben" }));
    await vi.waitFor(() => expect(geo.watchPosition).toHaveBeenCalled());
    geo.move({ ...youSouthWest, accuracy: 5 });

    expect(screen.getByText("120 m naar het noordoosten")).toBeInTheDocument();
    expect(screen.getByText("Rij 5: 40 m ten zuiden van de huidige plek")).toBeInTheDocument();
  });

  it("treats a timeout as a weak signal, not a refusal", async () => {
    seedStorage(withCoords);
    const geo = mockGeolocation();
    const { user, dialog } = await openMap();

    await user.click(within(dialog).getByRole("button", { name: "Show where I am" }));
    await vi.waitFor(() => expect(geo.watchPosition).toHaveBeenCalledTimes(1));
    geo.fail(3);
    expect(within(dialog).getByText(/No GPS signal yet/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).toBeNull();

    geo.move({ ...youSouthWest, accuracy: 5 });
    geo.fail(3);
    expect(within(dialog).getByText("120 m north-east")).toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).toBeNull();
  });

  it("shows an error when location is refused, and lets you try again", async () => {
    seedStorage(withCoords);
    const watchPosition = vi.fn(
      (_success: PositionCallback, error?: PositionErrorCallback | null) => {
        error?.({ code: 1 } as GeolocationPositionError);
        return 1;
      },
    );
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch: vi.fn() },
    });
    const { user, dialog } = await openMap();

    await user.click(within(dialog).getByRole("button", { name: "Show where I am" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      /Could not get your location/,
    );
    await user.click(within(dialog).getByRole("button", { name: "Show where I am" }));
    await vi.waitFor(() => expect(watchPosition).toHaveBeenCalledTimes(2));
  });
});
