import { afterEach, describe, expect, it, vi } from "vitest";

import { captureCoords } from "../src/lib/geolocation.ts";

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
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error?: PositionErrorCallback) => {
        error?.({ code: 1, message: "denied" } as GeolocationPositionError);
      },
    );

    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await expect(captureCoords()).rejects.toMatchObject({ code: 1 });
  });

  it("resolves null when geolocation is unavailable", async () => {
    vi.stubGlobal("navigator", {});

    await expect(captureCoords()).resolves.toBeNull();
  });
});
