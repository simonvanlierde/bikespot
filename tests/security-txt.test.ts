// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("security.txt", () => {
  const text = readFileSync("public/.well-known/security.txt", "utf8");

  it("names the contact from SECURITY.md and its own location", () => {
    expect(text).toContain("Contact: mailto:code@duinlab.nl");
    expect(text).toMatch(/^Canonical: https:\/\/bikespot\.duinlab\.nl\/\.well-known\/security\.txt$/m);
  });

  // RFC 9116 wants an Expires under a year out; failing here means it is time to renew it.
  it("expires in the future, within a year", () => {
    const expires = Date.parse(/^Expires: (.+)$/m.exec(text)?.[1] ?? "");

    expect(expires).toBeGreaterThan(Date.now());
    expect(expires).toBeLessThan(Date.now() + 366 * 24 * 3600 * 1000);
  });
});
