import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createLocationRecord } from "../../src/lib/domain.ts";
import { APP_DATA_STORAGE_KEY } from "../../src/lib/repository.ts";
import { sampleAppData } from "../fixtures.ts";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

// A station spot with all three plates (floor 2, lane 4, rack 42) and a note.
const data = {
  ...sampleAppData,
  station: {
    ...sampleAppData.station,
    enabledFields: { ...sampleAppData.station.enabledFields, floor: true, rackNumber: true },
  },
  current: createLocationRecord(
    {
      mode: "station",
      stationName: "My station",
      floor: "2",
      lane: "4",
      rackNumber: "42",
      side: "right",
      notes: "Next to the blue pillar",
      visibleFields: { floor: true, rackNumber: true, side: true },
    },
    new Date().toISOString(),
  ),
};

async function openReturnView(page: Page, { photo }: { photo: boolean }) {
  await page.addInitScript(
    ([key, value]) => {
      if (!window.localStorage.getItem(key as string)) {
        window.localStorage.setItem(key as string, value as string);
      }
    },
    [APP_DATA_STORAGE_KEY, JSON.stringify(data)],
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Rack 42" })).toBeAttached();

  if (photo) {
    await page.getByRole("button", { name: "Change spot" }).click();
    await page.getByRole("textbox", { name: "Lane" }).fill("4");
    await page.getByRole("textbox", { name: "Floor" }).fill("2");
    await page.getByRole("textbox", { name: "Rack number" }).fill("42");
    await page.getByRole("button", { name: "More details" }).click();
    await page.getByRole("textbox", { name: "Notes" }).fill("Next to the blue pillar");
    await page.getByLabel("Add photo").setInputFiles(resolve("tests/fixtures/photo-small.jpg"));
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("img", { name: "Current bike reference" })).toBeVisible();
  }
}

async function expectNoViolations(page: Page) {
  await page.evaluate(() => Promise.allSettled(document.getAnimations().map((animation) => animation.finished)));
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function box(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const { top, left, right, width } = el.getBoundingClientRect();
      return { top: Math.round(top), left, right, width };
    }),
  );
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`return view at 360 px (${colorScheme})`, () => {
    test.use({ colorScheme, viewport: { width: 360, height: 740 } });

    test("three plates share one row, the photo fills the sign, and axe is clean", async ({ page }) => {
      await openReturnView(page, { photo: true });

      const plates = await box(page, ".plate");
      expect(plates).toHaveLength(3);
      expect(new Set(plates.map((p) => p.top)).size).toBe(1);

      const [photo] = await box(page, ".current-card__photo");
      const [card] = await box(page, ".current-card");
      expect(photo?.width).toBeGreaterThan((card?.width ?? 0) * 0.8);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
      await expectNoViolations(page);

      // The details sheet leads with the photo, then the note.
      await page.getByRole("button", { name: /View details/ }).press("Enter");
      await expect(page.getByRole("dialog").getByRole("img", { name: "Saved bike reference" })).toBeVisible();
      const order = await page
        .getByRole("dialog")
        .locator(".preview-stack > *")
        .evaluateAll((els) => els.map((e) => e.className));
      expect(order.slice(0, 2)).toEqual(["photo-preview", "detail-note"]);
      await expectNoViolations(page);
    });
  });
}

test.describe("return view at 200% text", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("plates wrap inside the sign without sideways scroll, and axe is clean", async ({ page }) => {
    await openReturnView(page, { photo: false });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    const plates = await box(page, ".plate");
    const [card] = await box(page, ".current-card");
    expect(new Set(plates.map((p) => p.top)).size).toBeGreaterThan(1);
    for (const plate of plates) {
      expect(plate.left).toBeGreaterThanOrEqual(card?.left ?? 0);
      expect(plate.right).toBeLessThanOrEqual(card?.right ?? 0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await expectNoViolations(page);
  });
});
