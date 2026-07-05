import { afterEach, describe, expect, it } from "vitest";
import { setTheme } from "../src/lib/theme";

afterEach(() => {
  setTheme("system");
});

describe("theme", () => {
  it("reflects a forced palette onto <html> and persists it", () => {
    setTheme("dark");

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("bikespot-theme")).toBe("dark");
  });

  it("clears the attribute and storage when back on system", () => {
    setTheme("light");
    setTheme("system");

    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem("bikespot-theme")).toBeNull();
  });
});
