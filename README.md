# Bikespot

An offline-first PWA for remembering where you parked your bike. Everything stays on your device — no account, no server.

## Features

- **Save your spot** as a structured *station* location (lane, side, rack level, distance, floor, rack number) or a free-text *outside* description.
- **Optional GPS coordinates, photos and notes** attached to any spot.
- **Recent history** of your last five spots, each restorable as the current one.
- **Configurable station** — name, lane-input style, lane labels, visible fields, and default floor.
- **Installable and offline** via a generated service worker and web manifest.

By design, the app is single-device: no cross-device sync. State lives in `localStorage`; photos live in IndexedDB.

## Install

Open [bikespot.duinlab.nl](https://bikespot.duinlab.nl) and add it to your home screen:

- **iPhone / iPad (Safari):** tap **Share** → **Add to Home Screen** → **Add**.
- **Android (Chrome):** tap **⋮** → **Add to Home screen** → **Install**.
- **Desktop (Chrome / Edge):** click the **install icon** in the address bar, or **⋮** → **Install Bikespot**.

It then runs full-screen and works offline, like a native app.

## Tech stack

Preact + `@preact/signals`, TypeScript, Vite, `vite-plugin-pwa` (Workbox), Biome, and Vitest. Managed with pnpm.

## Development

Requires Node.js 24 and pnpm.

```bash
pnpm install
pnpm dev      # start the dev server
pnpm check    # lint, test, and build
```

`pnpm build` outputs a static site to `dist/`, deployable to any static host.

Released under the [MIT License](LICENSE).
