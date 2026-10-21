// Plain geometry for the spot map: distances, bearings, and a flat projection.
// At bike-park scale (metres to a few kilometres) the Earth is flat enough that
// an equirectangular projection around the centre point is accurate.

type LatLng = { lat: number; lng: number };

export type Compass = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
const COMPASS: Compass[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

const EARTH_RADIUS_M = 6_371_000;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

// Longitude difference folded into [-180, 180), so two points either side of
// the antimeridian are a short hop apart, not most of the way round.
function deltaLng(from: number, to: number): number {
  return ((((to - from + 180) % 360) + 360) % 360) - 180;
}

// Great-circle distance in metres (haversine).
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(deltaLng(a.lng, b.lng));
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Initial bearing from `from` to `to`, in degrees clockwise from north, [0, 360).
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const dLng = rad(deltaLng(from.lng, to.lng));
  const y = Math.sin(dLng) * Math.cos(rad(to.lat));
  const x =
    Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) - Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// The nearest of the eight compass points.
export function compassPoint(bearing: number): Compass {
  return COMPASS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8] ?? "n";
}

// Turns a heading measured from the device's top edge into one measured from
// the screen's top, given the screen's rotation (screen.orientation.angle).
export function screenHeading(deviceHeading: number, screenAngle: number): number {
  return (((deviceHeading + screenAngle) % 360) + 360) % 360;
}

// Metres east (x) and north (y) of `origin`.
export function toLocalMeters(origin: LatLng, point: LatLng): { x: number; y: number } {
  return {
    x: rad(deltaLng(origin.lng, point.lng)) * Math.cos(rad(origin.lat)) * EARTH_RADIUS_M,
    y: rad(point.lat - origin.lat) * EARTH_RADIUS_M,
  };
}

type Box = { minX: number; maxX: number; minY: number; maxY: number };

function boundsOf(points: { x: number; y: number }[]): Box {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

// Fit the points into a width x height box with `pad` on every side, north up,
// one scale for both axes. Returns screen positions (y grows downward) and the
// metres per pixel. Only the first `fitCount` points set the frame; later ones
// are placed in it and may fall outside. When the framing points all sit in
// one place, every point frames. A single point, or points all in one place,
// sits centred with metresPerPx 0.
// biome-ignore lint/complexity/useMaxParams: a box size and an optional count; an options object would only rename them
export function fitPoints(
  points: LatLng[],
  width: number,
  height: number,
  pad: number,
  fitCount = points.length,
): { positions: { x: number; y: number }[]; metersPerPx: number } {
  const origin = points[0];
  if (!origin) {
    return { positions: [], metersPerPx: 0 };
  }

  const local = points.map((point) => toLocalMeters(origin, point));
  let box = boundsOf(local.slice(0, Math.max(1, fitCount)));
  if (box.minX === box.maxX && box.minY === box.maxY) {
    box = boundsOf(local);
  }
  const metersPerPx = Math.max((box.maxX - box.minX) / (width - 2 * pad), (box.maxY - box.minY) / (height - 2 * pad));
  const midX = (box.minX + box.maxX) / 2;
  const midY = (box.minY + box.maxY) / 2;

  return {
    positions: local.map((p) => ({
      x: width / 2 + (metersPerPx ? (p.x - midX) / metersPerPx : 0),
      y: height / 2 - (metersPerPx ? (p.y - midY) / metersPerPx : 0),
    })),
    metersPerPx,
  };
}

// The longest 1, 2 or 5 x 10^n metres that fits in `maxPx`, for a scale bar.
export function scaleBar(metersPerPx: number, maxPx: number): { meters: number; px: number } | null {
  if (!(metersPerPx > 0)) {
    return null;
  }

  const limit = metersPerPx * maxPx;
  const magnitude = 10 ** Math.floor(Math.log10(limit));
  const meters = [5, 2, 1].map((step) => step * magnitude).find((value) => value <= limit) ?? magnitude;
  return { meters, px: meters / metersPerPx };
}
