import { computed, effect, signal } from "@preact/signals";
import type { Dict } from "./i18n/dict";
import en from "./i18n/en";

// Lean i18n: no framework. A `lang` signal (persisted, auto-detected) plus a
// `t` computed that swaps the whole string table. Mirrors theme.ts. Reading
// `t.value.x` in render subscribes the component, so a language switch
// re-renders everything. i18next earns its keep at hundreds of strings or ICU
// plurals; this app has neither.
//
// One module per language under ./i18n, each typed `Dict`, so a missing or
// misspelled key is a compile error. English is bundled and is the fallback;
// the other six load on demand with a dynamic import, and the service worker
// precaches them like any chunk. `ready` resolves once the detected language
// is loaded, and main.tsx waits for it before the first render.
export const LANGS = ["en", "nl", "de", "fr", "da", "sv", "ja"] as const;
export type Lang = (typeof LANGS)[number];

// Each language named in itself, so a reader finds theirs whatever the UI
// language is. Not part of Dict: the names don't change with the UI language.
export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  nl: "Nederlands",
  de: "Deutsch",
  fr: "Français",
  da: "Dansk",
  sv: "Svenska",
  ja: "日本語",
};

const LOADERS: Record<Exclude<Lang, "en">, () => Promise<{ default: Dict }>> = {
  nl: () => import("./i18n/nl"),
  de: () => import("./i18n/de"),
  fr: () => import("./i18n/fr"),
  da: () => import("./i18n/da"),
  sv: () => import("./i18n/sv"),
  ja: () => import("./i18n/ja"),
};

const STORAGE_KEY = "bikespot-lang";

const isLang = (value: string | null | undefined): value is Lang => (LANGS as readonly string[]).includes(value ?? "");

// A stored choice wins; otherwise the first browser language whose primary
// subtag we have ("de-AT" -> de, "ja-JP" -> ja); otherwise English.
export function detectLang(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) {
      return stored;
    }
  } catch {
    // Storage blocked (private mode): fall through to browser preference.
  }
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const primary = tag?.split("-")[0]?.toLowerCase();
    if (isLang(primary)) {
      return primary;
    }
  }
  return "en";
}

export const lang = signal<Lang>(detectLang());

// Reflect onto <html lang> (screen readers, spell-check) and persist. Runs on
// import so the attribute is set before first render.
effect(() => {
  document.documentElement.lang = lang.value;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang.value);
  } catch {
    // Storage blocked: choice still applies for this session.
  }
});

const dicts = signal<Partial<Record<Lang, Dict>>>({ en });

// A failed fetch is logged and leaves English showing.
async function load(code: Lang): Promise<void> {
  if (dicts.value[code] || code === "en") {
    return;
  }
  try {
    const { default: dict } = await LOADERS[code]();
    dicts.value = { ...dicts.value, [code]: dict };
  } catch (error) {
    console.error(`Could not load the ${code} translations`, error);
  }
}

// Starts at import, so the fetch overlaps with the rest of the app evaluating.
export const ready = load(lang.value);

// Switches once the new dictionary is in, so no screen is half translated.
export async function setLang(next: Lang): Promise<void> {
  await load(next);
  if (next === "en" || dicts.value[next]) {
    lang.value = next;
  }
}

export const t = computed(() => dicts.value[lang.value] ?? en);
