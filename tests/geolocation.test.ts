import { afterEach, describe, expect, it, vi } from "vitest";

import { captureCoords, watchCoords } from "../src/lib/geolocation.ts";

describe("captureCoords", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves rounded coordinates with accuracy on success", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 52.3791892345,
          longitude: 4.8994314567,
          accuracy: 11.7,
        },
      } as GeolocationPosition);
    });

    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await expect(captureCoords()).resolves.toEqual({
      lat: 52.379189,
      lng: 4.899431,
      accuracy: 12,
    });
  });

  it("rejects when the user denies permission", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
      error?.({ code: 1, message: "denied" } as GeolocationPositionError);
    });

    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await expect(captureCoords()).rejects.toMatchObject({ code: 1 });
  });

  it("resolves null when geolocation is unavailable", async () => {
    vi.stubGlobal("navigator", {});

    await expect(captureCoords()).resolves.toBeNull();
  });
});

describe("watchCoords", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports each position and stops when asked", () => {
    let report: PositionCallback = () => undefined;
    const watchPosition = vi.fn((success: PositionCallback) => {
      report = success;
      return 3;
    });
    const clearWatch = vi.fn();
    vi.stubGlobal("navigator", { geolocation: { watchPosition, clearWatch } });
    const onCoords = vi.fn();

    const stop = watchCoords(onCoords, () => undefined);
    report({ coords: { latitude: 52.1, longitude: 5.1, accuracy: 4.4 } } as GeolocationPosition);
    stop();

    expect(onCoords).toHaveBeenCalledWith({ lat: 52.1, lng: 5.1, accuracy: 4 });
    expect(clearWatch).toHaveBeenCalledWith(3);
  });

  it("reports a final error when geolocation is unavailable", () => {
    vi.stubGlobal("navigator", {});
    const onError = vi.fn();

    watchCoords(() => undefined, onError)();

    expect(onError).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("tells a refusal apart from a timeout", () => {
    let fail: PositionErrorCallback = () => undefined;
    const watchPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
      fail = error;
      return 3;
    });
    vi.stubGlobal("navigator", { geolocation: { watchPosition, clearWatch: vi.fn() } });
    const onError = vi.fn();

    watchCoords(() => undefined, onError);
    fail({ code: 3 } as GeolocationPositionError);
    fail({ code: 1 } as GeolocationPositionError);

    expect(onError.mock.calls).toEqual([[false], [true]]);
  });
});
