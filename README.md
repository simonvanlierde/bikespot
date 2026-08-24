# Bikespot

[![CI](https://github.com/simonvanlierde/bikespot/actions/workflows/ci.yml/badge.svg)](https://github.com/simonvanlierde/bikespot/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/simonvanlierde/bikespot/branch/main/graph/badge.svg)](https://codecov.io/gh/simonvanlierde/bikespot)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fbikespot.duinlab.nl)](https://bikespot.duinlab.nl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-installable-5a3.svg)](https://bikespot.duinlab.nl)

An offline-first PWA for remembering where you parked your bike. Everything stays on your device — no account, no server.

<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/home-dark.png">
  <img alt="Bikespot home screen" src="docs/screenshots/home-light.png" width="300">
</picture>
</p>

## Features

- **Save your spot** as a structured *station* location (lane, side, rack level, distance, floor, rack number) or a free-text *outside* description.
- **Optional GPS coordinates, photos and notes** attached to any spot.
- **Interrupted edits survive a reload** for up to an hour, so a backgrounded tab doesn't cost you what you typed.
- **Bike collected** clears the current spot once you have your bike back; it stays in history.
- **Recent history** of your last five spots, each restorable as the current one or removable.
- **Configurable station** — name, which details your garage has (floor, lane, distance, side, rack level, rack number), and number-or-preset input per field. Settings apply as you change them.
- **Installable and offline** via a generated service worker and web manifest.

By design, the app is single-device: no cross-device sync. State lives in `localStorage`; photos live in IndexedDB.

## Roadmap

- [ ] Add a map view for saved spots.
- [ ] Consider server-side sync for multi-device support, with optional end-to-end encryption.

## Install

Bikespot runs in the browser and installs as an app — no app store needed.

1. Open **[bikespot.duinlab.nl](https://bikespot.duinlab.nl)**.
2. Add it to your home screen:
   - **iOS (Safari):** Share → *Add to Home Screen*
   - **Android (Chrome):** menu (⋮) → *Install app*
   - **Desktop (Chrome/Edge):** install icon in the address bar

Once installed it works offline, and all data stays on your device.

## Tech stack

Preact + `@preact/signals`, TypeScript, Vite, `vite-plugin-pwa` (Workbox), Biome, and Vitest. Managed with pnpm.

## Architecture

The app is a small client-only PWA. `src/` has three layers — `components/` (presentational UI primitives) → `features/` (domain modules wiring store to UI) → `lib/` (types, pure domain logic, persistence, and the signals store) — over a single global store.

State is a set of `@preact/signals` in [`lib/store.ts`](src/lib/store.ts). UI reads signals directly; updates go through **pure functions** in [`lib/domain.ts`](src/lib/domain.ts) rather than in-place mutation, and an `effect()` persists the `data` signal whenever it changes. There is no router — navigation is modal state, modelled as the `OverlayState` discriminated union and rendered by [`features/app/AppOverlays.tsx`](src/features/app/AppOverlays.tsx). Persistence is split: structured app data in `localStorage` ([`lib/repository.ts`](src/lib/repository.ts)) and photos in IndexedDB with an in-memory fallback ([`lib/photos.ts`](src/lib/photos.ts)) — the reasoning is recorded in [ADR 0001](docs/adr/0001-split-persistence-across-localstorage-and-indexeddb.md).

## Development

Requires Node.js 24 and pnpm.

```bash
pnpm install
pnpm dev      # start the dev server
pnpm check    # lint, test, and build
```

`pnpm build` outputs a static site to `dist/`, deployable to any static host.

## Deployment

**[bikespot.duinlab.nl](https://bikespot.duinlab.nl)** is hosted on Cloudflare Pages via its Git
integration: a push to `main` triggers a build (`pnpm build`) that publishes `dist/`. The build
command and preview settings live in the Cloudflare dashboard; the repo only pins the output
directory in [`wrangler.jsonc`](wrangler.jsonc).

To deploy from a local checkout: `pnpm deploy` (`wrangler pages deploy`).

## License

[MIT](LICENSE) © Simon van Lierde
