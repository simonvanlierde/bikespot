import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import type { LocationRecord } from "../../src/lib/app-data.ts";
import { createLocationRecord } from "../../src/lib/domain.ts";
import { APP_DATA_STORAGE_KEY } from "../../src/lib/repository.ts";
import { sampleAppData } from "../fixtures.ts";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const spot = (fields: Record<string, unknown>) =>
  createLocationRecord(
    {
      mode: "station",
      stationName: "My station",
      visibleFields: { side: true, distance: true },
      ...fields,
    },
    new Date().toISOString(),
  );

// No coords on any of these: the diagram must not depend on GPS.
const cases: Record<string, LocationRecord> = {
  full: spot({ lane: "4", side: "left", distance: "far" }),
  laneOnly: spot({ lane: "4" }),
  none: spot({ notes: "By the blue pillar" }),
};

async function openDetails(page: Page, current: LocationRecord, lang?: string) {
  await page.addInitScript(
    ([key, value, language]) => {
      window.localStorage.setItem(key as string, value as string);
      if (language) {
        window.localStorage.setItem("bikespot-lang", language as string);
      }
    },
    [APP_DATA_STORAGE_KEY, JSON.stringify({ ...sampleAppData, current }), lang],
  );
  await page.goto("/");
  await page.locator(".current-card__hit").press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function expectNoViolations(page: Page) {
  await page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished)));
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`lane diagram at 360 px (${colorScheme})`, () => {
    test.use({ colorScheme, viewport: { width: 360, height: 740 } });

    for (const [name, current] of Object.entries(cases)) {
      test(`${name}: reachable without GPS, fits, axe is clean`, async ({ page }) => {
        await openDetails(page, current);
        const diagram = page.getByRole("dialog").getByRole("img", { name: /lane diagram/ });

        if (name === "none") {
          await expect(diagram).toHaveCount(0);
        } else {
          await expect(diagram).toBeVisible();
          await expect(page.getByRole("dialog").getByText("Seen from the lane's near end")).toBeVisible();
          const summary = page.getByRole("dialog").getByText("How to read this");
          await expect(page.getByText(/Not to scale/)).toBeHidden();
          expect((await summary.boundingBox())?.height).toBeGreaterThanOrEqual(44);
          await page.screenshot({ path: `test-results/shots/${name}-${colorScheme}.png`, fullPage: true });
          await summary.focus();
          await page.keyboard.press("Enter");
          await expect(page.getByText(/Not to scale/)).toBeVisible();
          await page.keyboard.press("Space");
          await expect(page.getByText(/Not to scale/)).toBeHidden();
          await page.keyboard.press("Space");
          await expect(page.getByText(/Not to scale/)).toBeVisible();
          await page.screenshot({ path: `test-results/shots/${name}-${colorScheme}-open.png`, fullPage: true });
          await expect(page.locator(".lane-diagram__mark")).toHaveCount(name === "full" ? 1 : 0);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
        await expectNoViolations(page);
        await page.screenshot({ path: `test-results/shots/${name}-${colorScheme}.png`, fullPage: true });
      });
    }
  });
}

test.describe("lane diagram at 200% text", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("caption wraps inside the sheet and axe is clean", async ({ page }) => {
    await openDetails(page, cases.full as LocationRecord);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await page.getByText("How to read this").click();
    // The sheet scrolls inside itself, so compare against its own edges.
    const sheet = await page.getByRole("dialog").boundingBox();
    for (const selector of [".lane-diagram", ".lane-diagram__svg"]) {
      const inner = await page.locator(selector).boundingBox();
      expect(inner?.x).toBeGreaterThanOrEqual(sheet?.x ?? 0);
      expect((inner?.x ?? 0) + (inner?.width ?? 0)).toBeLessThanOrEqual((sheet?.x ?? 0) + (sheet?.width ?? 0));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await expectNoViolations(page);
    await page.screenshot({ path: "test-results/shots/full-200.png", fullPage: true });
  });
});

test("lane diagram speaks the chosen language", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openDetails(page, cases.full as LocationRecord, "nl");
  await expect(page.getByRole("dialog").getByRole("img", { name: /baandiagram/ })).toBeVisible();
  await page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished)));
  await page.screenshot({ path: "test-results/shots/full-nl.png", fullPage: true });
});
