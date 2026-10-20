import { afterEach, describe, expect, it, vi } from "vitest";
import { detectLang } from "../src/lib/i18n.ts";

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
