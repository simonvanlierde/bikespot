import { expect, type Page, test } from "@playwright/test";
import { ROUTES } from "./routes";

// WCAG 1.4.10 Reflow: at 320 CSS px wide, content must not scroll sideways.
test.use({ viewport: { width: 320, height: 640 } });

for (const path of ROUTES) {
  test(`${path} does not scroll sideways at 320 px`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
}

// The page check above cannot see inside a sheet: the sheet is its own scroll box, so
// content wider than the sheet scrolls the sheet, not the page. List every element in
// the open sheet that can scroll sideways (the sheet, text fields) and holds content
// wider than its box. Elements with visible overflow are skipped: they cannot scroll,
// and what spills out of them lands in a checked scroll box. So is .sr-only, which
// clips its content to 1 px on purpose.
async function expectNoSidewaysScroll(page: Page, sheet: string) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const overflowing = await dialog.evaluate((root) =>
    [root, ...root.querySelectorAll("*")]
      .filter((el) => getComputedStyle(el).overflowX !== "visible" && !el.classList.contains("sr-only"))
      .filter((el) => el.scrollWidth > el.clientWidth)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className} ${el.scrollWidth} > ${el.clientWidth}`),
  );
  expect(overflowing, `${sheet} sheet`).toEqual([]);
}

// Closing the recent preview goes back to the recent list, so close until none is left.
async function closeSheets(page: Page) {
  const dialog = page.getByRole("dialog");
  while (await dialog.isVisible()) {
    await dialog.locator(".sheet-close").click();
  }
  await expect(dialog).toBeHidden();
}

// Opens every sheet. The details and recent-preview sheets need a saved spot and a
// recent one, so the editor saves twice on the way.
async function checkEverySheet(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();

  await page.getByRole("button", { name: "Save spot" }).click();
  await page.getByRole("button", { name: "More details" }).click();
  await expectNoSidewaysScroll(page, "editor, in the station");
  await page.getByRole("button", { name: "Parked Outside" }).click();
  await expectNoSidewaysScroll(page, "editor, outside");
  await page.getByRole("textbox", { name: "Notes" }).fill("By the lamp post");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: "Change spot" }).click();
  await page.getByRole("button", { name: "Parked Outside" }).click();
  await page.getByRole("textbox", { name: "Notes" }).fill("Under the bridge");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: "View details" }).press("Enter");
  await expectNoSidewaysScroll(page, "details");
  await closeSheets(page);

  await page.getByRole("button", { name: /Recent locations/ }).click();
  await expectNoSidewaysScroll(page, "recent list");
  await page.locator(".recent-item").first().click();
  await expectNoSidewaysScroll(page, "recent preview");
  await closeSheets(page);

  await page.getByRole("button", { name: "Spot map" }).click();
  await expectNoSidewaysScroll(page, "spot map");
  await closeSheets(page);

  await page.getByRole("button", { name: "Settings" }).click();
  await expectNoSidewaysScroll(page, "settings");
}

test("no sheet scrolls sideways at 320 px", async ({ page }) => {
  await checkEverySheet(page);
});

test.describe("on a touch screen", () => {
  // A coarse pointer shows the Take photo button next to Add photo.
  test.use({ hasTouch: true, isMobile: true });

  test("no sheet scrolls sideways at 320 px", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Save spot" }).click();
    await page.getByRole("button", { name: "More details" }).click();
    await expect(page.getByText("Take photo")).toBeVisible();
    await closeSheets(page);
    await checkEverySheet(page);
  });
});
