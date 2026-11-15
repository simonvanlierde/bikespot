import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { ROUTES } from "./routes";

// WCAG 2.0, 2.1 and 2.2 at levels A and AA, plus axe's best-practice rules (landmarks,
// one h1). Any violation fails, whatever its impact.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function expectNoViolations(page: Page) {
  // A sheet that is still rising is partly transparent, which axe reads as low contrast.
  await page.evaluate(() => Promise.allSettled(document.getAnimations().map((animation) => animation.finished)));
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();

  // One line per violation, then the selector of each element it hit. The
  // comparison is on the rule ids alone, so the diff stays short.
  const report = violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `  ${n.target.join(" ")}`).join("\n")}`)
    .join("\n");
  expect(
    violations.map((v) => v.id),
    report,
  ).toEqual([]);
}

async function closeSheets(page: Page) {
  const dialog = page.getByRole("dialog");
  while (await dialog.isVisible()) {
    await dialog.locator(".sheet-close").click();
  }
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${colorScheme})`, () => {
    test.use({ colorScheme });

    // Contrast, target size and focus visibility only compute in a real browser, so
    // every sheet is opened and scanned here, not only under jsdom.
    test("every sheet has no violations", async ({ page }) => {
      await page.context().grantPermissions(["geolocation"]);
      await page.context().setGeolocation({ latitude: 52, longitude: 5, accuracy: 10 });
      await page.goto("/");
      await expect(page.getByRole("main")).toBeVisible();

      for (const lane of ["4", "5"]) {
        await page.getByRole("button", { name: /^(Save spot|Change spot)$/ }).click();
        await page.getByRole("textbox", { name: "Lane" }).fill(lane);
        if (lane === "5") {
          await page.getByRole("button", { name: "More details" }).click();
          await page.getByRole("button", { name: "Use my location" }).click();
          await expect(page.getByText(/Captured/)).toBeVisible();
        }
        await expectNoViolations(page);
        await page.getByRole("button", { name: "Save", exact: true }).click();
        await expect(page.getByRole("dialog")).toBeHidden();
      }

      await page.getByRole("button", { name: "View details" }).press("Enter");
      await expectNoViolations(page);
      await closeSheets(page);

      await page.getByRole("button", { name: /Recent locations/ }).click();
      await expectNoViolations(page);
      await page.locator(".recent-item").first().click();
      await expectNoViolations(page);
      await closeSheets(page);

      await page.getByRole("button", { name: "Spot map" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectNoViolations(page);
      await closeSheets(page);

      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await expectNoViolations(page);
      await page.getByRole("button", { name: "Clear parking data" }).click();
      await expectNoViolations(page);
    });

    for (const path of ROUTES) {
      test(`${path} has no WCAG A or AA or best-practice violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("main")).toBeVisible();

        await expectNoViolations(page);
      });
    }
  });
}
