# Bikespot

[![ts](https://github.com/simonvanlierde/bikespot/actions/workflows/ts.yml/badge.svg)](https://github.com/simonvanlierde/bikespot/actions/workflows/ts.yml)
[![codecov](https://codecov.io/gh/simonvanlierde/bikespot/branch/main/graph/badge.svg)](https://codecov.io/gh/simonvanlierde/bikespot)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fbikespot.duinlab.nl)](https://bikespot.duinlab.nl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-installable-5a3.svg)](https://bikespot.duinlab.nl)

Bikespot helps you remember where you parked your bike. It's a web app you can install like an app (a PWA), and it works offline. Everything stays on your device: there's no account and no server.

It saves the spot the way a station bike park labels it (lane, side, rack level, distance, floor, rack number), or as a free-text description, with an optional photo, note and GPS coordinates.

It speaks English, Dutch, German, French, Danish, Swedish and Japanese. It follows your browser's language, and you can switch in Settings.

<!-- rumdl-disable MD033 -->
<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/home-dark.png">
  <img alt="Bikespot home screen" src="docs/screenshots/home-light.png" width="300">
</picture>
</p>
<!-- rumdl-enable MD033 -->

## Install

Open **[bikespot.duinlab.nl](https://bikespot.duinlab.nl)** and add it to your home screen:

- **iOS (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** menu (⋮) → *Install app*
- **Desktop (Chrome/Edge):** install icon in the address bar

The app stores spots on this device, with no sync between devices. Export spots in Settings saves the current and recent spot details to a file, without photos or station settings. Import spots keeps the five newest spots in Recent and leaves your current spot unchanged. Restore a spot from Recent to make it current.

## Run it locally

```bash
pnpm install
pnpm dev
```

## Social card

`public/og.png` is the 1200x630 card shown when the link is shared. It shows the current-spot sign,
captured from the app. The source is [docs/og-card.html](docs/og-card.html); the captures it uses are in
`docs/og-card/`.

```sh
pnpm og-card:capture   # capture the sign and map from the app, with demo data, at 3x
pnpm og-card           # render docs/og-card.html to public/og.png
```

`pnpm og-card --option map` draws the other layout (the spot map and the distance to the bike). The build
adds the PNG's hash to the `og:image` URL, so a changed card gets a new URL.

## Deploy

CI can deploy the checked build to Cloudflare Workers and create pull request previews.
[Deployment setup and the Pages migration](docs/architecture.md#deployment) cover the required environments, credentials and domain checks.

## More

- [CONTRIBUTING.md](CONTRIBUTING.md): prerequisites and checks
- [docs/architecture.md](docs/architecture.md): code layout, storage and deployment
- [docs/adr/](docs/adr/): design decisions
- [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md): who it's for and how it looks

## License

[MIT](LICENSE) © Simon van Lierde
