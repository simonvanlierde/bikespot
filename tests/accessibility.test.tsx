import { act, render, screen } from "@testing-library/preact";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import App from "../src/App.tsx";
import { createStore, type OverlayRequest, type Store } from "../src/lib/store.ts";
import { seedStorage } from "./fixtures.ts";

// One entry per overlay kind; the preview needs a recent id from the seeded data.
const overlays: Record<OverlayRequest["kind"], (store: Store) => OverlayRequest> = {
  closed: () => ({ kind: "closed" }),
  "edit-location": () => ({ kind: "edit-location" }),
  "station-settings": () => ({ kind: "station-settings" }),
  "location-details": () => ({ kind: "location-details" }),
  "recent-list": () => ({ kind: "recent-list" }),
  "spot-map": () => ({ kind: "spot-map" }),
  "recent-preview": (store) => ({ kind: "recent-preview", id: store.data.value.recent[0]!.id }),
};

// Tests assert on violations directly so the failure message lists offending rules,
// without depending on vitest-axe's custom matcher type augmentation.
async function violations(container: Element) {
  return (await axe(container)).violations;
}

describe("accessibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the first-run main view with no axe violations", async () => {
    const { container } = render(<App store={createStore()} />);

    expect(await violations(container)).toEqual([]);
  });

  it.each(Object.keys(overlays) as OverlayRequest["kind"][])(
    "renders the %s overlay with no axe violations",
    async (kind) => {
      seedStorage();
      const store = createStore();
      const { container } = render(<App store={store} />);
      act(() => store.openOverlay(overlays[kind](store)));
      expect(screen.queryByRole("dialog") === null).toBe(kind === "closed");

      expect(await violations(container)).toEqual([]);
    },
  );
});
