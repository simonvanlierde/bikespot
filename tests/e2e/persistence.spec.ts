import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("an invalid import explains the error inside Settings", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Import spots", { exact: true }).setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText(
    "Not a Bikespot export file — nothing imported",
  );
});

test("a saved reference photo survives an offline reload", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Save spot" }).click();
  await page.getByRole("button", { name: "Parked Outside" }).click();
  await page.getByRole("textbox", { name: "Notes" }).fill("Beside the green pillar");
  await page.getByLabel("Add photo").setInputFiles(resolve("tests/fixtures/photo-small.jpg"));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();

  await expect(page.getByText("Beside the green pillar", { exact: true })).toBeVisible();
  const photo = page.getByRole("img", { name: "Current bike reference" });
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});

test("an exported spot can be imported and restored on a fresh device", async ({ page, browser }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Save spot" }).click();
  await page.getByRole("textbox", { name: "Lane" }).fill("42");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export spots" }).click();
  const download = await downloading;
  const file = testInfo.outputPath("spots.json");
  await download.saveAs(file);

  const destination = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  try {
    const fresh = await destination.newPage();
    await fresh.goto("/");
    await fresh.getByRole("button", { name: "Settings", exact: true }).click();
    await fresh.getByLabel("Import spots", { exact: true }).setInputFiles(file);
    await expect(fresh.getByRole("dialog").getByRole("status")).toHaveText("1 spot imported");
    await fresh.getByRole("button", { name: "Close", exact: true }).click();
    await expect(fresh.getByRole("dialog")).toBeHidden();
    await expect(fresh.getByRole("heading", { name: "No bike parked" })).toBeVisible();
    await fresh.getByRole("button", { name: "Recent locations 1" }).click();
    await fresh.getByRole("button", { name: /Lane 42/ }).click();
    await fresh.getByRole("button", { name: "Restore this spot" }).click();
    await expect(fresh.getByRole("heading", { name: "Lane 42" })).toBeVisible();
  } finally {
    await destination.close();
  }
});
