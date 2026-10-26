import { expect, test } from "@playwright/test";

// Escape is the keyboard way out of a sheet. A tablet or phone with a keyboard
// still has a touch screen, so check it in a touch context too. Escape goes
// straight after the tap that opens the sheet, as a quick hand would press it.
for (const touch of [false, true]) {
  test.describe(touch ? "on a touch screen" : "with a mouse", () => {
    test.use({ hasTouch: touch, isMobile: touch });

    test("Escape closes the spot map", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Save spot" }).click();
      await page.getByRole("button", { name: "More details" }).click();
      await page.getByRole("button", { name: "Parked Outside" }).click();
      await page.getByRole("textbox", { name: "Notes" }).fill("By the lamp post");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeHidden();

      await page.getByRole("button", { name: "Spot map" }).click();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Spot map" })).toBeHidden();
    });
  });
}
