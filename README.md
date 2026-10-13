# Bikespot

[![CI](https://github.com/simonvanlierde/bikespot/actions/workflows/ci.yml/badge.svg)](https://github.com/simonvanlierde/bikespot/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/simonvanlierde/bikespot/branch/main/graph/badge.svg)](https://codecov.io/gh/simonvanlierde/bikespot)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fbikespot.duinlab.nl)](https://bikespot.duinlab.nl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-installable-5a3.svg)](https://bikespot.duinlab.nl)

Bikespot helps you remember where you parked your bike. It's a web app you can install like an app (a PWA), and it works offline. Everything stays on your device: there's no account and no server.

<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/home-dark.png">
  <img alt="Bikespot home screen" src="docs/screenshots/home-light.png" width="300">
</picture>
</p>

## Features

- **Save your spot** in one of two ways. A *station* spot is a location in a bike garage, made of fields (lane, side, rack level, distance, floor, rack number). An *outside* spot is a free-text description.
- **Add GPS coordinates, photos and notes** to any spot if you want.
- **Interrupted edits survive a reload** for up to an hour. If the tab goes to the background, you don't lose what you typed.
- **Bike collected** clears the current spot once you have your bike back. The spot stays in history.
- **Recent history** keeps your last five spots. You can make one the current spot again, or remove it.
- **Set up your station:** its name, which details your garage has (floor, lane, distance, side, rack level, rack number), and whether each field takes a number or a preset. Settings apply as you change them.
- **Install it and use it offline.** A generated service worker and web manifest make this work.

The app works on one device only, on purpose: there's no sync between devices. App state lives in `localStorage` and photos live in IndexedDB. To move spots to another device or keep a backup, use Export spots and Import spots in Settings. The file is `{"version": 1, "spots": [...]}` and leaves photos out.

## Roadmap

- [ ] Add a map view for saved spots.
- [ ] Consider server-side sync for multi-device support, with optional end-to-end encryption.

## Install

Bikespot runs in the browser and installs as an app. You don't need an app store.

1. Open **[bikespot.duinlab.nl](https://bikespot.duinlab.nl)**.
2. Add it to your home screen:
   - **iOS (Safari):** Share → *Add to Home Screen*
   - **Android (Chrome):** menu (⋮) → *Install app*
   - **Desktop (Chrome/Edge):** install icon in the address bar

Once installed it works offline, and all data stays on your device.

## Tech stack

Preact + `@preact/signals`, TypeScript, Vite, `vite-plugin-pwa` (Workbox), Biome, and Vitest. Managed with pnpm.

## Architecture

The app is a small PWA that runs entirely in the browser. `src/` has three layers on top of one global store:

- `components/` holds the basic UI pieces, which only display things.
- `features/` holds the app's features, each connecting the store to the UI.
- `lib/` holds the types, the domain logic (pure functions), saving and loading, and the signals store.

State is a set of `@preact/signals` in [`lib/store.ts`](src/lib/store.ts). The UI reads signals directly. Updates go through **pure functions** in [`lib/domain.ts`](src/lib/domain.ts) instead of changing data in place. An `effect()` saves the `data` signal whenever it changes.

There is no router. Navigation is modal state: the `OverlayState` discriminated union describes which overlay is open, and [`features/app/AppOverlays.tsx`](src/features/app/AppOverlays.tsx) renders it.

Data is saved in two places. Structured app data goes to `localStorage` ([`lib/repository.ts`](src/lib/repository.ts)). Photos go to IndexedDB, with an in-memory fallback ([`lib/photos.ts`](src/lib/photos.ts)). [ADR 0001](docs/adr/0001-split-persistence-across-localstorage-and-indexeddb.md) explains why.

## Development

Prerequisites and the dev commands are in [CONTRIBUTING.md](CONTRIBUTING.md).

`pnpm build` writes a static site to `dist/`. You can deploy it to any static host.

## Deployment

**[bikespot.duinlab.nl](https://bikespot.duinlab.nl)** runs on Cloudflare Pages, through its Git
integration. A push to `main` starts a build (`pnpm build`), which publishes `dist/`. The build
command and preview settings live in the Cloudflare dashboard. The repo only sets the output
directory, in [`wrangler.jsonc`](wrangler.jsonc).

To deploy from a local checkout: `pnpm deploy` (`wrangler pages deploy`).

## License

[MIT](LICENSE) © Simon van Lierde
