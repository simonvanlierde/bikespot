import { render, screen } from "@testing-library/preact";
import { describe, expect, it } from "vitest";

import { LaneDiagram } from "../src/features/location/LaneDiagram.tsx";
import { getLaneDiagram, getMark, LANE } from "../src/features/location/laneDiagram.ts";
import { createLocationRecord } from "../src/lib/domain.ts";

const station = (
  fields: Record<string, unknown>,
  visible: { side?: true; distance?: true } = { side: true, distance: true },
) =>
  createLocationRecord(
    { mode: "station", stationName: "My station", visibleFields: visible, ...fields },
    "2026-04-19T08:00:00.000Z",
  );

describe("lane diagram geometry", () => {
  it("marks one cell when side and distance are known", () => {
    expect(getMark("right", "far")).toEqual({ x: LANE.x + LANE.w / 2, y: LANE.y, w: LANE.w / 2, h: LANE.h / 3 });
    expect(getMark("left", "close")).toEqual({ x: LANE.x, y: LANE.y + (2 * LANE.h) / 3, w: LANE.w / 2, h: LANE.h / 3 });
  });

  it("keeps the unknown axis at full lane size", () => {
    expect(getMark("left")).toEqual({ x: LANE.x, y: LANE.y, w: LANE.w / 2, h: LANE.h });
    expect(getMark(undefined, "middle")).toEqual({ x: LANE.x, y: LANE.y + LANE.h / 3, w: LANE.w, h: LANE.h / 3 });
    expect(getMark()).toBeUndefined();
  });

  it("reads only saved, visible fields and skips outside spots", () => {
    expect(getLaneDiagram(station({ lane: "4" }))).toEqual({
      lane: "4",
      side: undefined,
      distance: undefined,
      mark: undefined,
    });
    expect(getLaneDiagram(station({ lane: "4", side: "left" }, { distance: true }))?.side).toBeUndefined();
    expect(getLaneDiagram(station({}))).toBeNull();
    expect(getLaneDiagram({ ...station({ lane: "4" }), mode: "outside" })).toBeNull();
  });
});

describe("lane diagram component", () => {
  it("names the saved details and explains the viewing direction", () => {
    const { container } = render(<LaneDiagram entry={station({ lane: "4", side: "left", distance: "far" })} />);
    expect(screen.getByRole("img", { name: /Lane 4, Left side, Far distance/ })).toBeTruthy();
    expect(screen.getByText(/Not to scale/)).toBeTruthy();
    expect(container.querySelectorAll(".lane-diagram__mark")).toHaveLength(1);
  });

  it("draws no mark for a lane-only spot and nothing for an empty one", () => {
    const { container, rerender } = render(<LaneDiagram entry={station({ lane: "4" })} />);
    expect(container.querySelector(".lane-diagram__mark")).toBeNull();
    rerender(<LaneDiagram entry={station({})} />);
    expect(container.querySelector("figure")).toBeNull();
  });
});
