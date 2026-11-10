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

Cloudflare serves the built files in `dist/`. [`wrangler.jsonc`](../wrangler.jsonc) configures a Worker
for production and pull request previews. [`public/_headers`](../public/_headers) sets the response headers.
Pages continues serving **[bikespot.duinlab.nl](https://bikespot.duinlab.nl)** through its existing Git integration
until the custom domain is moved to the verified Worker.

The [`ts` workflow](../.github/workflows/ts.yml) uploads the checked build, including hidden files.
Production waits for app checks and browser tests before deploying that artifact after a push to `main`.
It skips deployment with a notice if its Cloudflare credentials are missing.
Run `pnpm deploy` to build and deploy locally after configuring credentials.

### Pull request previews

Open, ready pull requests from this repository receive a public Worker named `bikespot-pr-<number>`.
The deployment and job summary link to its `workers.dev` address. Previews send `X-Robots-Tag: noindex`
and keep the app's security headers. Fork and bot pull requests skip previews.

The [retirement workflow](../.github/workflows/preview-retire.yml) deletes a preview when its pull request closes
or becomes a draft. A daily sweep retries missed deletions. Failed pull request lookups keep the preview
and fail the sweep. Run the workflow manually with PR numbers to retire specific previews, or leave it empty to sweep.

### Set up Workers and migrate from Pages

Keep Pages and its production domain available until the Worker passes these checks.
A preview address has separate browser storage; it cannot see spots saved on the production domain.

1. In GitHub **Settings → Environments**, create `preview` and `production`.
   Let `preview` deploy pull request refs. Restrict `production` to the `main` branch.
2. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as secrets in each environment.
   The token needs **Account → Workers Scripts: Edit** for the target account, which needs a `workers.dev` subdomain.
   The scripts also read that account's Workers subdomain.
   Use separate accounts if preview credentials must be unable to overwrite the production Worker.
3. Check that the target account has no unrelated Worker named `bikespot` before the first deployment.
   Merge the deployment changes and check the next production job's `workers.dev` address.
   Save and reopen a spot, reload `/privacy` and `/accessibility`, and check security headers and `/.well-known/security.txt`.
   Use a human pull request to verify preview creation, its `noindex` header and retirement.
4. After approving the domain move, remove `bikespot.duinlab.nl` from the Pages project's **Custom domains**.
   Add the same hostname under the `bikespot` Worker's **Settings → Domains & Routes → Add → Custom Domain**.
   Expect a short gap while Cloudflare reassigns the domain. Keep the Pages project for rollback.
   Check HTTPS, saved spots, offline reopening, legal pages and security headers on the custom domain.
5. Delete the Pages project only after the custom domain checks pass and rollback is no longer needed.

The Wrangler config deliberately leaves the custom domain unbound during migration.
[Cloudflare's custom domain guide](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
explains the dashboard fields. This deployment update adopts the Worker workflow from project-templates v0.13.0;
it does not advance the Copier pin or apply the release's unrelated configuration changes.
