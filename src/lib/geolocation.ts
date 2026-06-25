import type { Coords } from './app-data';

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

// Captures the device's current coordinates. Resolves to null when the browser
// has no Geolocation API; rejects when the user denies permission or the lookup
// times out, so callers can surface an error state.
export function captureCoords(): Promise<Coords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise<Coords | null>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: round(position.coords.latitude),
          lng: round(position.coords.longitude),
          accuracy:
            typeof position.coords.accuracy === 'number'
              ? Math.round(position.coords.accuracy)
              : undefined,
        });
      },
      (error) => reject(error),
      GEOLOCATION_OPTIONS,
    );
  });
}
