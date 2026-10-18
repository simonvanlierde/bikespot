import type { Coords } from "./app-data";

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function toCoords(position: GeolocationPosition): Coords {
  return {
    lat: round(position.coords.latitude),
    lng: round(position.coords.longitude),
    accuracy:
      typeof position.coords.accuracy === "number"
        ? Math.round(position.coords.accuracy)
        : undefined,
  };
}

function hasGeolocation(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

// Captures the device's current coordinates. Resolves to null when the browser
// has no Geolocation API; rejects when the user denies permission or the lookup
// times out, so callers can surface an error state.
export function captureCoords(): Promise<Coords | null> {
  if (!hasGeolocation()) {
    return Promise.resolve(null);
  }

  return new Promise<Coords | null>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toCoords(position)),
      (error) => reject(error),
      GEOLOCATION_OPTIONS,
    );
  });
}

// Follows the device's position until the returned function is called. Calls
// onError once, straight away, when the browser has no Geolocation API.
export function watchCoords(onCoords: (coords: Coords) => void, onError: () => void): () => void {
  if (!hasGeolocation()) {
    onError();
    return () => undefined;
  }

  // Keep the object the watch started on, so stopping clears that same watch.
  const { geolocation } = navigator;
  const id = geolocation.watchPosition(
    (position) => onCoords(toCoords(position)),
    () => onError(),
    { ...GEOLOCATION_OPTIONS, timeout: 30_000 },
  );
  return () => geolocation.clearWatch(id);
}
