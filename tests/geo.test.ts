import { describe, expect, it } from "vitest";

import { formatDistance } from "../src/features/location/display.ts";
import {
  bearingDegrees,
  compassPoint,
  distanceMeters,
  fitPoints,
  scaleBar,
  screenHeading,
  toLocalMeters,
} from "../src/lib/geo.ts";
import { lang } from "../src/lib/i18n.ts";

const amsterdamCentraal = { lat: 52.3791, lng: 4.9003 };
const utrechtCentraal = { lat: 52.0894, lng: 5.1101 };

describe("distanceMeters", () => {
  it("measures one degree along a meridian and along the equator", () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111_195, -1);
  });

  it("matches known city pairs", () => {
    // Amsterdam Centraal to Utrecht Centraal is about 35 km as the crow flies.
    expect(distanceMeters(amsterdamCentraal, utrechtCentraal) / 1000).toBeCloseTo(35.1, 0);
    // London to Paris: 343.5 km on a 6371 km sphere.
    expect(
      distanceMeters({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 }) / 1000,
    ).toBeCloseTo(343.5, 0);
  });

  it("is zero for the same point and symmetric", () => {
    expect(distanceMeters(amsterdamCentraal, amsterdamCentraal)).toBe(0);
    expect(distanceMeters(amsterdamCentraal, utrechtCentraal)).toBeCloseTo(
      distanceMeters(utrechtCentraal, amsterdamCentraal),
      6,
    );
  });

  it("takes the short way across the antimeridian", () => {
    const meters = distanceMeters({ lat: 0, lng: 179.9995 }, { lat: 0, lng: -179.9995 });
    expect(meters).toBeCloseTo(111, 0);
  });
});

describe("bearingDegrees and compassPoint", () => {
  const origin = { lat: 52, lng: 5 };
  const step = 0.001;

  it.each([
    ["n", { lat: 52 + step, lng: 5 }, 0],
    ["e", { lat: 52, lng: 5 + step }, 90],
    ["s", { lat: 52 - step, lng: 5 }, 180],
    ["w", { lat: 52, lng: 5 - step }, 270],
  ] as const)("points %s", (compass, to, bearing) => {
    expect(bearingDegrees(origin, to)).toBeCloseTo(bearing, 0);
    expect(compassPoint(bearingDegrees(origin, to))).toBe(compass);
  });

  it.each([
    ["ne", 1, 1],
    ["se", -1, 1],
    ["sw", -1, -1],
    ["nw", 1, -1],
  ] as const)("finds the %s quadrant", (compass, north, east) => {
    // Equal metres north and east, so the bearing is a clean diagonal.
    const to = { lat: 52 + north * step, lng: 5 + (east * step) / Math.cos((52 * Math.PI) / 180) };
    expect(compassPoint(bearingDegrees(origin, to))).toBe(compass);
  });

  it("rounds to the nearest of eight points and wraps at north", () => {
    expect(compassPoint(22)).toBe("n");
    expect(compassPoint(23)).toBe("ne");
    expect(compassPoint(338)).toBe("n");
    expect(compassPoint(-90)).toBe("w");
    expect(compassPoint(720)).toBe("n");
  });

  it("does not break across the antimeridian", () => {
    const bearing = bearingDegrees({ lat: 0, lng: 179.9995 }, { lat: 0, lng: -179.9995 });
    expect(Number.isFinite(bearing)).toBe(true);
    expect(compassPoint(bearing)).toBe("e");
  });
});

describe("screenHeading", () => {
  it("leaves the heading alone in portrait", () => {
    expect(screenHeading(30, 0)).toBe(30);
  });

  it("turns the heading with the screen, wrapping into [0, 360)", () => {
    // Phone on its side, top edge to the left: the screen's top is the phone's right edge.
    expect(screenHeading(0, 90)).toBe(90);
    expect(screenHeading(300, 90)).toBe(30);
    expect(screenHeading(10, 180)).toBe(190);
    expect(screenHeading(45, 270)).toBe(315);
    expect(screenHeading(350, 270)).toBe(260);
  });
});

describe("projection", () => {
  it("places points in metres east and north of the origin", () => {
    const local = toLocalMeters({ lat: 52, lng: 5 }, { lat: 52.001, lng: 5 });
    expect(local.x).toBeCloseTo(0, 6);
    expect(local.y).toBeCloseTo(111.2, 1);
  });

  it("fits points inside the padded box, north up, one scale for both axes", () => {
    const { positions, metersPerPx } = fitPoints(
      [
        { lat: 52, lng: 5 },
        { lat: 52.001, lng: 5 },
      ],
      320,
      220,
      20,
    );
    // 111 m spread over the 180 px of usable height.
    expect(metersPerPx).toBeCloseTo(111.2 / 180, 2);
    expect(positions[0]).toEqual({ x: 160, y: 200 });
    expect(positions[1].x).toBeCloseTo(160, 6);
    expect(positions[1].y).toBeCloseTo(20, 6);
  });

  it("centres a single point and has no scale", () => {
    expect(fitPoints([{ lat: 52, lng: 5 }], 320, 220, 20)).toEqual({
      positions: [{ x: 160, y: 110 }],
      metersPerPx: 0,
    });
    expect(fitPoints([], 320, 220, 20).positions).toEqual([]);
  });

  it("frames only the first points and places later ones in that frame", () => {
    const spots = [
      { lat: 52, lng: 5 },
      { lat: 52.001, lng: 5 },
    ];
    const far = { lat: 52.05, lng: 5.05 };
    const framed = fitPoints([...spots, far], 320, 220, 20, 2);

    expect(framed.positions.slice(0, 2)).toEqual(fitPoints(spots, 320, 220, 20).positions);
    expect(framed.positions[2].x).toBeGreaterThan(320);
    expect(framed.positions[2].y).toBeLessThan(0);
  });

  it("frames every point when the framing points sit in one place", () => {
    const { positions, metersPerPx } = fitPoints(
      [
        { lat: 52, lng: 5 },
        { lat: 52.001, lng: 5 },
      ],
      320,
      220,
      20,
      1,
    );
    expect(metersPerPx).toBeGreaterThan(0);
    expect(positions[1].y).toBeCloseTo(20, 6);
  });

  it("keeps points near the antimeridian close together", () => {
    const { positions } = fitPoints(
      [
        { lat: 0, lng: 179.9995 },
        { lat: 0, lng: -179.9995 },
      ],
      320,
      220,
      20,
    );
    expect(positions[1].x).toBeGreaterThan(positions[0].x);
    expect(positions.every((p) => p.x >= 20 && p.x <= 300)).toBe(true);
  });
});

describe("scaleBar", () => {
  it("picks the longest 1-2-5 step that fits", () => {
    expect(scaleBar(1, 100)).toEqual({ meters: 100, px: 100 });
    expect(scaleBar(1, 90)).toEqual({ meters: 50, px: 50 });
    expect(scaleBar(0.5, 100)).toEqual({ meters: 50, px: 100 });
    expect(scaleBar(3, 100)).toEqual({ meters: 200, px: 200 / 3 });
  });

  it("has no bar without a scale", () => {
    expect(scaleBar(0, 100)).toBeNull();
  });
});

describe("formatDistance", () => {
  it("rounds to steps a reader can use", () => {
    lang.value = "en";
    expect(formatDistance(7.4)).toBe("7 m");
    expect(formatDistance(42)).toBe("40 m");
    expect(formatDistance(123)).toBe("120 m");
    expect(formatDistance(996)).toBe("1 km");
    expect(formatDistance(1234)).toBe("1.2 km");
    lang.value = "nl";
    expect(formatDistance(1234)).toBe("1,2 km");
    lang.value = "en";
  });
});
