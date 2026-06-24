# Bike Storage Tracker

An offline-first PWA for remembering where you parked your bike. Everything stays on your device — no account, no server.

## Features

- **Save your spot** as a structured *station* location (lane, side, rack level, distance, floor, rack number) or a free-text *outside* description.
- **Photos and notes** attached to any spot.
- **Recent history** of your last five spots, each restorable as the current one.
- **Configurable station** — name, lane-input style, lane labels, visible fields, and default floor.
- **Optional GPS coordinates** — capture a spot's location and reopen it as an "Open in Maps" link. Configurable per station (never, ask, or always); no map is embedded, so the app stays offline-first.
- **Installable and offline** via a generated service worker and web manifest.

By design, the app is single-device: no cross-device sync. State lives in `localStorage`; photos live in IndexedDB.

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
