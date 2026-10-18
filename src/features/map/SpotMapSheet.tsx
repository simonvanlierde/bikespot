import { LocateFixed, MapPin } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { SheetDialog } from "@/components/SheetDialog";
import { formatDistance, getPrimaryLabel, mapsLink } from "@/features/location/display";
import type { Coords, LocationRecord } from "@/lib/app-data";
import { bearingDegrees, compassPoint, distanceMeters, fitPoints, scaleBar } from "@/lib/geo";
import { watchCoords } from "@/lib/geolocation";
import { lang, t } from "@/lib/i18n";

// The drawing's own units; the SVG scales to the sheet's width.
const WIDTH = 320;
const HEIGHT = 220;
const PAD = 28;
// Closer than this, GPS cannot tell you from the bike.
const AT_BIKE_M = 10;

type PlacedSpot = { id: string; marker: string; label: string; coords: Coords };

type OrientationWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };

// Compass heading in degrees from north, or null when the event has none.
// shortcut: ignores screen rotation, so the arrow is off in landscape; add
// screen.orientation.angle if people use the map sideways.
function headingOf(event: OrientationWithCompass): number | null {
  if (typeof event.webkitCompassHeading === "number") {
    return event.webkitCompassHeading;
  }
  return event.absolute && typeof event.alpha === "number" ? (360 - event.alpha) % 360 : null;
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
      if (next !== null) {
        setHeading(next);
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
function requestOrientationAccess(): void {
  const orientation = (globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent as
    | { requestPermission?: () => Promise<unknown> }
    | undefined;
  try {
    orientation?.requestPermission?.().catch(() => undefined);
  } catch {
    // Refused outright: the map works without a heading.
  }
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
  const { positions, metersPerPx } = fitPoints(points, WIDTH, HEIGHT, PAD);
  const offset = currentCoords ? 1 : 0;
  const currentAt = currentCoords ? positions[0] : null;
  const youAt = position ? positions[positions.length - 1] : null;
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
                  <circle className="spot-map__you" r="7" />
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
                  <span>{t.value.you}</span>
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
            {attempt === 0 || failed ? (
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
            ) : null}
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
