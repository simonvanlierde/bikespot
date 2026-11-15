import type { Distance, LocationRecord, Side } from "@/lib/app-data";
import { shouldShowEntryField } from "./display";

// Unit-less drawing space shared by the geometry and the SVG. The lane is a
// vertical strip seen from its near end: close at the bottom, far at the top.
export const LANE = { x: 20, y: 8, w: 56, h: 105 };

export type Rect = { x: number; y: number; w: number; h: number };
export type LaneDiagram = { lane?: string; side?: Side; distance?: Distance; mark?: Rect };

const BAND: Record<Distance, number> = { far: 0, middle: 1, close: 2 };

// The part of the lane the saved details pin down. An unknown side keeps the
// full width and an unknown distance the full length, so nothing is guessed.
export function getMark(side?: Side, distance?: Distance): Rect | undefined {
  if (!(side || distance)) {
    return undefined;
  }

  const w = side ? LANE.w / 2 : LANE.w;
  const h = distance ? LANE.h / 3 : LANE.h;

  return {
    x: side === "right" ? LANE.x + w : LANE.x,
    y: distance ? LANE.y + BAND[distance] * h : LANE.y,
    w,
    h,
  };
}

// Null when the record saved no lane, side or distance: there is nothing to draw.
export function getLaneDiagram(entry: LocationRecord): LaneDiagram | null {
  if (entry.mode !== "station") {
    return null;
  }

  const lane = shouldShowEntryField(entry, "lane") ? entry.lane : undefined;
  const side = shouldShowEntryField(entry, "side") ? entry.side : undefined;
  const distance = shouldShowEntryField(entry, "distance") ? entry.distance : undefined;

  return lane || side || distance ? { lane, side, distance, mark: getMark(side, distance) } : null;
}
