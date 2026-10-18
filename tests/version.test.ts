import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const changelog = readFileSync("CHANGELOG.md", "utf8");

describe("release version", () => {
  it("shows the latest released version in the CHANGELOG", () => {
    const latest = changelog.match(/^## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}$/m);

    expect(latest?.[1]).toBe(__APP_VERSION__);
  });
});
