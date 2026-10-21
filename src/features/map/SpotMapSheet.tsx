import { LocateFixed, MapPin } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { SheetDialog } from "@/components/SheetDialog";
import { formatDistance, getPrimaryLabel, mapsLink } from "@/features/location/display";
import type { Coords, LocationRecord } from "@/lib/app-data";
import {
  bearingDegrees,
  compassPoint,
  distanceMeters,
  fitPoints,
  scaleBar,
  screenHeading,
} from "@/lib/geo";
import { watchCoords } from "@/lib/geolocation";
import { lang, t } from "@/lib/i18n";

// The drawing's own units; the SVG scales to the sheet's width.
const WIDTH = 320;
const HEIGHT = 220;
const PAD = 28;
// How close to the drawing's edge an out-of-frame marker sits.
const EDGE = 12;
// Closer than this, GPS cannot tell you from the bike.
const AT_BIKE_M = 10;

type PlacedSpot = { id: string; marker: string; label: string; coords: Coords };

type OrientationWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };

// Compass heading of the screen's top edge in degrees from north, or null when
// the event has none. Both sources measure from the device's top edge (Safari's
// comes from Core Location, which assumes portrait), so both need the screen's
// rotation. Reading it per event is enough: turning the phone moves the sensor.
function headingOf(event: OrientationWithCompass): number | null {
  const angle = globalThis.screen?.orientation?.angle ?? 0;
  if (typeof event.webkitCompassHeading === "number") {
    return screenHeading(event.webkitCompassHeading, angle);
  }
  return event.absolute && typeof event.alpha === "number"
    ? screenHeading(360 - event.alpha, angle)
    : null;
}

// Follows the device's position and heading from the first tap until the sheet closes.
function useTracking(attempt: number) {
  const [position, setPosition] = useState<Coords | null>(null);
  const [failed, setFailed] = useState(false);
  // A timeout or lost signal before the first fix: the watch keeps trying.
  const [noSignal, setNoSignal] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (attempt === 0) {
      return;
    }

    setFailed(false);
    setNoSignal(false);
    const stopWatching = watchCoords(
      (coords) => {
        setPosition(coords);
        setFailed(false);
        setNoSignal(false);
      },
      (final) => (final ? setFailed(true) : setNoSignal(true)),
    );
    const onOrientation = (event: Event) => {
      const next = headingOf(event as OrientationWithCompass);
      // 5° steps: the sensor fires up to 60 times a second, and an unchanged
      // value skips the re-render.
      if (next !== null) {
        setHeading(Math.round(next / 5) * 5);
      }
    };
    // Chrome sends compass headings only on the "absolute" event; Safari puts
    // them on the plain one as webkitCompassHeading.
    window.addEventListener("deviceorientationabsolute", onOrientation);
    window.addEventListener("deviceorientation", onOrientation);

    return () => {
      stopWatching();
      window.removeEventListener("deviceorientationabsolute", onOrientation);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [attempt]);

  return { position, failed, noSignal, heading };
}

// Safari asks for motion access, and only from inside a tap. Elsewhere this is a no-op.
// A refusal is fine: the map works without a heading.
function requestOrientationAccess(): void {
  const orientation = globalThis.DeviceOrientationEvent as
    | { requestPermission?: () => Promise<unknown> }
    | undefined;
  orientation?.requestPermission?.().catch(() => undefined);
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: JSX render fn; markup dominates the line count
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the branches are the map's no-GPS, located and not-yet-located states
export function SpotMapSheet({
  current,
  recent,
  onClose,
}: {
  current: LocationRecord | null;
  recent: LocationRecord[];
  onClose: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const { position, failed, noSignal, heading } = useTracking(attempt);

  const currentCoords = current?.coords;
  const recentSpots: PlacedSpot[] = recent
    .flatMap((entry) => (entry.coords ? [{ entry, coords: entry.coords }] : []))
    .map(({ entry, coords }, index) => ({
      id: entry.id,
      marker: String(index + 1),
      label: getPrimaryLabel(entry),
      coords,
    }));
  const spotCount = recentSpots.length + (currentCoords ? 1 : 0);

  const points = [
    ...(currentCoords ? [currentCoords] : []),
    ...recentSpots.map((spot) => spot.coords),
    ...(position ? [position] : []),
  ];
  // The spots set the frame, so walking far off does not shrink them to one dot.
  const { positions, metersPerPx } = fitPoints(points, WIDTH, HEIGHT, PAD, spotCount);
  const offset = currentCoords ? 1 : 0;
  const currentAt = currentCoords ? positions[0] : null;
  const youRaw = position ? (positions.at(-1) ?? null) : null;
  // Out of frame, your marker sits on the drawing's edge, on the side you are.
  const youAt = youRaw && {
    x: Math.min(Math.max(youRaw.x, EDGE), WIDTH - EDGE),
    y: Math.min(Math.max(youRaw.y, EDGE), HEIGHT - EDGE),
  };
  const youOffMap = youRaw !== null && (youAt?.x !== youRaw.x || youAt?.y !== youRaw.y);
  const scale = scaleBar(metersPerPx, WIDTH / 3);

  let route: string | null = null;
  let way = "";
  if (position && currentCoords) {
    const meters = distanceMeters(position, currentCoords);
    const direction = compassPoint(bearingDegrees(position, currentCoords));
    way = meters < AT_BIKE_M ? "here" : direction;
    route =
      meters < AT_BIKE_M ? t.value.atYourBike : t.value.towards(formatDistance(meters), direction);
  }
  const status =
    route ?? (attempt > 0 && !failed ? (noSignal ? t.value.noSignal : t.value.locatingYou) : "");

  // A screen reader hears the route again only when the way to the bike
  // changes (another compass point, or arrived), not on every few metres of
  // walking or GPS jitter.
  const spoken = useRef({ key: "", text: "" });
  const spokenKey = route === null ? status : `${lang.value}:${way}`;
  if (spoken.current.key !== spokenKey) {
    spoken.current = { key: spokenKey, text: status };
  }

  return (
    <SheetDialog label={t.value.spotMap} title={t.value.spotMap} onClose={onClose}>
      <div className="preview-stack">
        {spotCount === 0 ? (
          <p className="detail-note">{t.value.mapNoGps}</p>
        ) : (
          <>
            <p className="spot-map__intro">{t.value.mapIntro}</p>
            <svg
              aria-label={t.value.mapLabel(spotCount)}
              className="spot-map__canvas"
              role="img"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            >
              <g className="spot-map__north" transform={`translate(${WIDTH - 18} 20)`}>
                <path d="M0 -10 L5 4 L0 1 L-5 4 Z" />
                <text y="16">N</text>
              </g>
              {scale ? (
                <g className="spot-map__scale" transform={`translate(14 ${HEIGHT - 14})`}>
                  <path d={`M0 -5 V0 H${scale.px} V-5`} />
                  <text y="-9">{formatDistance(scale.meters)}</text>
                </g>
              ) : null}
              {youAt && currentAt ? (
                <line
                  className="spot-map__route-line"
                  x1={youAt.x}
                  x2={currentAt.x}
                  y1={youAt.y}
                  y2={currentAt.y}
                />
              ) : null}
              {recentSpots.map((spot, index) => {
                const at = positions[index + offset];
                if (!at) {
                  return null;
                }
                return (
                  <g key={spot.id} transform={`translate(${at.x} ${at.y})`}>
                    <circle className="spot-map__spot" r="10" />
                    <text className="spot-map__spot-text">{spot.marker}</text>
                  </g>
                );
              })}
              {currentAt ? (
                <g transform={`translate(${currentAt.x} ${currentAt.y})`}>
                  <circle className="spot-map__spot spot-map__spot--current" r="13" />
                  <text className="spot-map__spot-text spot-map__spot-text--current">P</text>
                </g>
              ) : null}
              {youAt ? (
                <g transform={`translate(${youAt.x} ${youAt.y})`}>
                  {heading === null ? null : (
                    <path
                      className="spot-map__heading"
                      d="M0 -22 L7 -8 L-7 -8 Z"
                      transform={`rotate(${heading})`}
                    />
                  )}
                  <circle
                    className={`spot-map__you${youOffMap ? " spot-map__you--off" : ""}`}
                    r="7"
                  />
                </g>
              ) : null}
            </svg>

            <ul className="spot-map__legend">
              {current && currentCoords ? (
                <li>
                  <span aria-hidden="true" className="spot-map__key spot-map__key--current">
                    P
                  </span>
                  <span>
                    {t.value.currentSpot}: {getPrimaryLabel(current)}
                  </span>
                </li>
              ) : null}
              {recentSpots.map((spot) => (
                <li key={spot.id}>
                  <span aria-hidden="true" className="spot-map__key">
                    {spot.marker}
                  </span>
                  <span>
                    {currentCoords
                      ? t.value.fromCurrent(
                          spot.label,
                          formatDistance(distanceMeters(currentCoords, spot.coords)),
                          compassPoint(bearingDegrees(currentCoords, spot.coords)),
                        )
                      : spot.label}
                  </span>
                </li>
              ))}
              {position ? (
                <li>
                  <span aria-hidden="true" className="spot-map__key spot-map__key--you" />
                  <span>{youOffMap ? t.value.youOffMap : t.value.you}</span>
                </li>
              ) : null}
            </ul>
          </>
        )}

        {current && !currentCoords && spotCount > 0 ? (
          <p className="detail-note">{t.value.mapCurrentNoGps}</p>
        ) : null}

        {currentCoords ? (
          <div className="spot-map__route">
            <p className="section-kicker">{t.value.toYourBike}</p>
            <p className="spot-map__distance">{status}</p>
            <p aria-live="polite" className="sr-only">
              {spoken.current.text}
            </p>
            {failed ? (
              <p className="spot-map__error" role="alert">
                {t.value.positionError}
              </p>
            ) : null}
            {/* Stays after the tap, so focus is not lost; a second tap restarts the watch. */}
            <button
              className="ghost-button ghost-button--wide"
              type="button"
              onClick={() => {
                requestOrientationAccess();
                setAttempt((value) => value + 1);
              }}
            >
              <LocateFixed aria-hidden="true" className="button-icon" />
              <span>{t.value.showMyPosition}</span>
            </button>
            <a
              className="maps-link"
              href={mapsLink(currentCoords)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MapPin aria-hidden="true" className="button-icon" />
              <span>{t.value.openInMaps}</span>
            </a>
          </div>
        ) : null}
      </div>
    </SheetDialog>
  );
}
