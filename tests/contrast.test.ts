import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/base.css", "utf8");
const surfaces = readFileSync("src/styles/surfaces.css", "utf8");
const features = readFileSync("src/styles/features.css", "utf8");

// The token block, and the blocks that force a theme from Settings.
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

// An rgba() colour laid over an opaque hex background, as hex.
function over(color: string, bg: string): string {
  const m = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (!m) {
    return color;
  }
  const alpha = Number(m[4]);
  return `#${[1, 2, 3]
    .map((i) => {
      const under = Number.parseInt(bg.slice(2 * i - 1, 2 * i + 1), 16);
      return Math.round(Number(m[i]) * alpha + under * (1 - alpha))
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("palette contrast", () => {
  // Every colour is defined once, as light-dark(light, dark); a forced theme only
  // switches color-scheme. A new :root block (say a prefers-contrast palette)
  // needs its own palette below.
  it("defines the tokens in one block and forces themes through color-scheme", () => {
    expect(blocks).toHaveLength(3);
    expect(blocks[1]).toMatch(/^\s*color-scheme: light;\s*$/);
    expect(blocks[2]).toMatch(/^\s*color-scheme: dark;\s*$/);
  });

  it("draws selected-state indicators with the --selected token", () => {
    expect(surfaces).toMatch(/\.toggle-row__input:checked \{\s*background: var\(--selected\);/);
    expect(surfaces).toMatch(/\.segment\.is-active \{[^}]*border-color: var\(--selected\);/);
    expect(surfaces).toMatch(/\n\.primary-button \{[^}]*border-color: var\(--selected\);/);
  });

  // A control's outline is what shows it is a control, so it needs 3:1 too; the
  // paler --line hairline is for cards and dividers only.
  it.each([
    ".ghost-button",
    ".segment",
    ".file-trigger",
    ".labels-editor__remove",
    ".text-button--switch",
    ".utility-button",
    ".recent-item",
    ".app-footer__version",
  ])("outlines %s with the --control-edge token", (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rule = new RegExp(
      `\\n${escaped} \\{[^}]*border(?:-color)?:[^;]*var\\(--control-edge\\);`,
    );
    expect(`\n${surfaces}\n${features}`).toMatch(rule);
  });

  const palette = tokens(blocks[0]);

  for (const [name, scheme] of [
    ["light", 0],
    ["dark", 1],
  ] as const) {
    const resolve = (value: string): string => {
      const ref = value.match(/^var\((--[\w-]+)\)$/);
      if (ref) {
        return resolve(palette[ref[1]]);
      }
      // light-dark(light, dark); an argument may hold one level of parentheses.
      const pair = value.match(/^light-dark\(((?:[^,()]|\([^()]*\))+),\s*(.+)\)$/);
      return pair ? resolve(pair[scheme + 1].trim()) : value;
    };

    it.each(["--selected", "--control-edge"])(
      `gives %s 3:1 against every ${name} background`,
      (token) => {
        for (const bg of ["--bg", "--surface", "--surface-sunken"]) {
          expect(ratio(resolve(palette[token]), resolve(palette[bg]))).toBeGreaterThanOrEqual(3);
        }
      },
    );

    it(`gives the keyline-edged Maps button 3:1 against the ${name} sign`, () => {
      const sign = resolve(palette["--sign"]);
      expect(ratio(over(resolve(palette["--sign-keyline"]), sign), sign)).toBeGreaterThanOrEqual(3);
    });
  }
});
