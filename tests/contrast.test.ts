import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/base.css", "utf8");

// The token blocks in order: light (:root), dark (media query), forced dark.
const blocks = [...css.matchAll(/:root(?:[^{]*)\{([^}]*)\}/g)].map((m) => m[1]);

function tokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
  );
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("palette contrast", () => {
  const light = tokens(blocks[0]);
  const palettes = {
    light,
    dark: { ...light, ...tokens(blocks[1]) },
    "forced dark": { ...light, ...tokens(blocks[2]) },
  };

  for (const [name, palette] of Object.entries(palettes)) {
    const resolve = (value: string): string => {
      const ref = value.match(/^var\((--[\w-]+)\)$/);
      return ref ? resolve(palette[ref[1]]) : value;
    };

    it(`gives a checked switch 3:1 against every ${name} background`, () => {
      for (const bg of ["--bg", "--surface", "--surface-sunken"]) {
        expect(ratio(resolve(palette["--switch-on"]), resolve(palette[bg]))).toBeGreaterThanOrEqual(
          3,
        );
      }
    });
  }
});
