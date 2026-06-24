# Bike Storage Tracker

An offline-first PWA for remembering where you parked your bike. Everything is stored client-side in the browser — no account, no server.

## What works

- **Save your current spot** in one of two modes: a structured *station* spot (lane, side, rack level, distance, floor, rack number) or a free-text *outside* description.
- **Attach a photo** to a spot (kept in IndexedDB) and add free-form notes.
- **Recent history**: the last five spots are kept, and any of them can be restored as the current spot.
- **Configurable station**: name, lane-input style (quick labels or numbers), lane labels, which fields are shown, and a default floor.
- **Installable and offline-capable**: a service worker and web manifest are generated at build time, so the app works without a connection.

State lives in `localStorage`; photo blobs live in IndexedDB.

## Planned / not done yet

- No GPS or map — spots are entered manually, not located automatically.
- No remote sync, accounts, or cross-device sharing (storage is per-browser by design).
- Not currently deployed to a public URL.

## Tech stack

Preact + `@preact/signals`, TypeScript, Vite, `vite-plugin-pwa` (Workbox), Biome, Vitest. Managed with pnpm.

## Local development

Requires Node.js 24 and `pnpm`.

```bash
pnpm install
pnpm dev      # start the dev server
pnpm check    # lint + test + build (the full gate)
```

`pnpm build` outputs a static site to `dist/`, deployable to any static host (the repo is set up for Cloudflare Pages).

Released under the [MIT License](LICENSE).
