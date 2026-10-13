import { act, render, screen, waitFor } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import App from "../src/App.tsx";
import type { OverlayState } from "../src/lib/app-data.ts";
import { closeOverlay, data, hydrated, openOverlay } from "../src/lib/store.ts";
import { seedStorage } from "./fixtures.ts";

// One entry per OverlayState kind; the preview needs a recent id, known only after hydration.
const overlays: Record<OverlayState["kind"], () => OverlayState> = {
  closed: () => ({ kind: "closed" }),
  "edit-location": () => ({ kind: "edit-location" }),
  "station-settings": () => ({ kind: "station-settings" }),
  "location-details": () => ({ kind: "location-details" }),
  "recent-list": () => ({ kind: "recent-list" }),
  "recent-preview": () => ({ kind: "recent-preview", id: data.value.recent[0].id }),
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

  afterEach(() => {
    closeOverlay();
  });

  it("renders the first-run main view with no axe violations", async () => {
    const { container } = render(<App />);

    expect(await violations(container)).toEqual([]);
  });

  it.each(Object.keys(overlays) as OverlayState["kind"][])(
    "renders the %s overlay with no axe violations",
    async (kind) => {
      seedStorage();
      const { container } = render(<App />);
      await waitFor(() => expect(hydrated.value).toBe(true));
      act(() => openOverlay(overlays[kind]()));
      expect(screen.queryByRole("dialog") === null).toBe(kind === "closed");

      expect(await violations(container)).toEqual([]);
    },
  );
});
