// Captures the app elements the social card shows (docs/og-card.html) at 3x,
// from seeded demo state and the dev server. Run with `pnpm og-card:capture`.
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const PORT = 4399;
const now = new Date("2026-05-12T17:30:00+02:00");
const ago = (minutes) => new Date(now.getTime() - minutes * 60_000).toISOString();

const station = {
  name: "",
  laneInputMode: "number",
  laneLabels: ["4", "5", "6"],
  floorInputMode: "number",
  floorLabels: ["1", "2", "3"],
  enabledFields: { lane: true, side: true, rackLevel: true, distance: false, floor: false, rackNumber: true },
};
const data = {
  station,
  current: {
    id: "a",
    mode: "station",
    stationName: "",
    updatedAt: ago(125),
    lane: "8",
    side: "right",
    rackLevel: "bottom",
    rackNumber: "42",
    visibleFields: { side: true, rackLevel: true, rackNumber: true },
    coords: { lat: 52.16655, lng: 4.48205, accuracy: 6 },
  },
  recent: [],
};

const server = spawn("pnpm", ["exec", "vite", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
const url = `http://localhost:${PORT}/`;
for (let i = 0; i < 60; i++) {
  // biome-ignore lint/performance/noAwaitInLoops: polls until the dev server answers
  if (
    await fetch(url).then(
      (r) => r.ok,
      () => false,
    )
  )
    break;
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 800 },
    deviceScaleFactor: 3,
    colorScheme: "light",
    locale: "en",
    permissions: ["geolocation"],
    geolocation: { latitude: 52.16625, longitude: 4.48235, accuracy: 8 },
  });
  const page = await context.newPage();
  await page.clock.install({ time: now });
  await page.addInitScript((value) => localStorage.setItem("bikespot-app", JSON.stringify(value)), data);
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  // The sign without its pin, buttons and timestamp, so Lane, side and rack stay large on the card.
  await page.addStyleTag({
    content:
      ".current-card__topline-end, .current-card__footer, .current-card .timestamp { display: none !important; }",
  });
  await page.locator(".current-card").screenshot({ path: "docs/og-card/sign.png" });

  await page.getByRole("button", { name: "Spot map" }).click();
  await page.getByRole("button", { name: "Show where I am" }).click();
  await page.locator(".spot-map__distance").filter({ hasText: /\d/ }).waitFor();
  await page.waitForTimeout(300);
  await page.locator(".spot-map__canvas").screenshot({ path: "docs/og-card/map.png" });
  await page.locator(".spot-map__distance").screenshot({ path: "docs/og-card/distance.png" });
  await page.screenshot({
  });
} finally {
  await browser.close();
  server.kill();
}
