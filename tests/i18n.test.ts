import { afterEach, describe, expect, it, vi } from "vitest";
import { DISTANCES, RACK_LEVELS, SIDES } from "../src/lib/app-data.ts";
import { detectLang, LANGS, lang, setLang, t } from "../src/lib/i18n.ts";

const COMPASS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
const ENUM_KEYS = new Set<string>([...COMPASS, ...DISTANCES, ...SIDES, ...RACK_LEVELS]);

// Argument lists per template. A template missing here fails the test, so a new
// one gets exercised in every language.
const CALLS: Record<string, unknown[][]> = {
  updated: [["14:05"]],
  saved: [["14:05"]],
  accuracy: [["12"]],
  mapLabel: [[1], [3]],
  towards: COMPASS.map((d) => ["120 m", d]),
  fromCurrent: COMPASS.map((d) => ["Utrecht", "120 m", d]),
  viewRecent: [["Utrecht"]],
  presetLabel: [["Lane", 2]],
  removePreset: [["Lane", 2]],
  addPreset: [["Lane"]],
  rackN: [["1234"]],
  laneN: [["4"]],
  stationFloorN: [["2"]],
  factDistance: DISTANCES.map((d) => [d]),
  factSide: SIDES.map((s) => [s]),
  factRack: RACK_LEVELS.map((r) => [r]),
  noticeImported: [[1], [3]],
  viewSourceVersion: [["1.2.3"]],
};

function browserLanguages(languages: string[], language = languages[0] ?? "") {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(languages);
  vi.spyOn(navigator, "language", "get").mockReturnValue(language);
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.removeItem("bikespot-lang");
});

describe("detectLang", () => {
  it("keeps a stored choice", () => {
    browserLanguages(["nl-NL"]);
    window.localStorage.setItem("bikespot-lang", "ja");
    expect(detectLang()).toBe("ja");
  });

  it("ignores a stored value it does not know", () => {
    browserLanguages(["sv-SE"]);
    window.localStorage.setItem("bikespot-lang", "xx");
    expect(detectLang()).toBe("sv");
  });

  it("takes the first browser language it has, by primary subtag", () => {
    browserLanguages(["pt-BR", "de-AT", "fr-FR"]);
    expect(detectLang()).toBe("de");
  });

  it("falls back to navigator.language without a list", () => {
    browserLanguages([], "da-DK");
    expect(detectLang()).toBe("da");
  });

  it("falls back to English", () => {
    browserLanguages(["pt-BR", "es"]);
    expect(detectLang()).toBe("en");
  });
});

// Preset nouns may be inflected, so only the other templates must echo their text.
const ECHOES_ARGS = (key: string) => !key.endsWith("Preset") && key !== "presetLabel";

// What is wrong with one rendered template, as readable lines; empty when it is fine.
function problems(label: string, out: unknown, echoed: string[]): string[] {
  if (typeof out !== "string") {
    return [`${label} returned ${typeof out}`];
  }
  const found = /undefined|NaN|\$\{/.test(out) ? [`${label}: ${out}`] : [];
  return [...found, ...echoed.filter((arg) => !out.includes(arg)).map((arg) => `${label} drops "${arg}": ${out}`)];
}

describe("templates", () => {
  afterEach(() => setLang("en"));

  it.each(LANGS)("render every argument in %s", (code) => {
    setLang(code);
    expect(lang.value).toBe(code);
    const templates = Object.entries(t.value).filter(([, value]) => typeof value === "function");
    const missing = templates.map(([key]) => key).filter((key) => !CALLS[key]);
    expect(missing, "templates with no sample arguments").toEqual([]);
    const found = templates.flatMap(([key, fn]) =>
      (CALLS[key] ?? []).flatMap((args) => {
        // Enum keys are translated away; values the caller formats must reach the output.
        const echoed = ECHOES_ARGS(key)
          ? args.filter((a): a is string => typeof a === "string" && !ENUM_KEYS.has(a))
          : [];
        const out = (fn as (...a: unknown[]) => unknown)(...args);
        return problems(`${code}.${key}(${args.join(", ")})`, out, echoed);
      }),
    );
    expect(found).toEqual([]);
  });
});
