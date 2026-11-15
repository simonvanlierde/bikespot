// Renders docs/og-card.html to the 1200x630 social card. `pnpm og-card [--option map] [--out file]`.

import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";

const { values } = parseArgs({
  options: { option: { type: "string", default: "sign" }, out: { type: "string", default: "public/og.png" } },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL("docs/og-card.html").href);
  await page.evaluate((option) => document.body.classList.add(option), values.option);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: values.out });
} finally {
  await browser.close();
}
