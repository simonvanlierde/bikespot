# Architecture

Bikespot is a small PWA that runs entirely in the browser, built with Preact + `@preact/signals`, TypeScript, Vite and `vite-plugin-pwa` (Workbox). `src/` has three layers on top of one store:

- `components/` holds the basic UI pieces, which only display things.
- `features/` holds the app's features, each connecting the store to the UI.
- `lib/` holds the types, the domain logic (pure functions), saving and loading, and the signals store.

State is a few `@preact/signals` made by `createStore()` in [`lib/store.ts`](../src/lib/store.ts). [`main.tsx`](../src/main.tsx) creates the one store and passes it to `App`; tests create a fresh one each. The UI reads signals directly. Updates go through **pure functions** in [`lib/domain.ts`](../src/lib/domain.ts) instead of changing data in place. Once `App` calls `store.start()`, an `effect()` saves the `data` signal whenever it changes.

There is no router. Navigation is modal state: the `OverlayState` discriminated union describes which overlay is open, together with the state that belongs to it (the editor's draft, error and GPS status, or the settings draft). [`features/app/AppOverlays.tsx`](../src/features/app/AppOverlays.tsx) renders it.

## Storage

The store reaches storage only through the `SpotRepository` interface in [`lib/repository.ts`](../src/lib/repository.ts), which also keeps photos and records in step. Structured app data goes to `localStorage`. Photos go to IndexedDB, with an in-memory fallback ([`lib/photos.ts`](../src/lib/photos.ts)). [ADR 0001](adr/0001-split-persistence-across-localstorage-and-indexeddb.md) explains why.

The export file is `{"version": 1, "spots": [...]}` and leaves photos out.

## Deployment

**[bikespot.duinlab.nl](https://bikespot.duinlab.nl)** runs on Cloudflare Pages, through its Git integration. A push to `main` starts a build (`pnpm build`), which publishes the static site in `dist/`. The build command and preview settings live in the Cloudflare dashboard. The repo only sets the output directory, in [`wrangler.jsonc`](../wrangler.jsonc). `dist/` also works on any other static host.

To deploy from a local checkout: `pnpm deploy` (`wrangler pages deploy`).
