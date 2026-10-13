# Product

## Platform

web

## Users

One person who parks a bike at a large Dutch station bike park and has to find it again hours later. They save the spot one-handed while walking away from the bike, often outdoors in bright light, and read it back on the way in, with the bike park's own signs in view.

## Product Purpose

Bikespot remembers where you left your bike: the current spot, the last five spots, and how your station is laid out. Success is walking straight to the bike without searching the rows.

## Positioning

The spot is described in the bike park's own terms (lane, side, rack level, distance from the entrance, floor, rack number), not as a pin on a map. GPS is optional. A note such as "next to the green bike" is part of a spot's identity, not a comment on it. Everything stays on the device: no account, no server.

## Operating Context

- People save while walking away from the bike, so saving takes few taps and survives an interruption. An interrupted edit comes back after a reload for up to an hour.
- People read the spot while walking back in, often with no signal underground or inside the bike park.
- A spot is either *in the station* (structured fields; the lane is required) or *outside* (free text; it needs a note, a photo or a GPS fix).
- Each person configures their own station: its name, which fields the bike park has, and number or preset input for lane and floor.
- **Bike collected** clears the current spot and keeps it in history.

## Capabilities and Constraints

- Client-only Preact PWA, installable, works offline. Hosted as a static site on Cloudflare Pages at bikespot.duinlab.nl.
- App data lives in `localStorage`, photos in IndexedDB ([ADR 0001](docs/adr/0001-split-persistence-across-localstorage-and-indexeddb.md)). Single device by design. Export and import move spots as JSON, without photos.
- Photo location metadata is stripped where the browser allows it; the user is told when it could not be.
- English and Dutch, picked from the browser and switchable in Settings. Dutch uses its own adjectival forms, not translated templates.
- Light, dark and system themes.
- Terms: *spot*, *current spot*, *recent locations*, *station*, *lane*, *side*, *rack level*, *rack number*, *bike collected*.

## Brand Commitments

- Name: Bikespot. MIT-licensed, by Simon van Lierde.
- The look borrows from Dutch station wayfinding signs (see [DESIGN.md](DESIGN.md)).
- Voice: short, plain, second person ("Save where you leave your bike, and find it again later. Everything stays on this phone.").

## Evidence on Hand

- Screenshots: `docs/screenshots/home-light.png`, `docs/screenshots/home-dark.png`.
- No users, testimonials or usage data exist. Do not invent any.
- First run shows no fake data: no parked bike and empty history, with an empty state that explains the app.

## Product Principles

1. Finding the bike beats everything else. The current spot is the first and largest thing on screen.
2. One hand, one glance. Every action works with a thumb while walking, and the spot reads at a glance in sunlight.
3. The device is the whole system. Nothing leaves it unless the user exports it.
4. Speak the bike park's language. Fields match the signs in the bike park, and the user turns off the ones their station lacks.
5. Honest by default. No sample data, no silent data loss, and errors stay on screen until the next action.

## Accessibility & Inclusion

- The test suite runs axe on the main view and on every overlay.
- Touch targets are at least 2.75rem (44px); control edges keep 3:1 contrast against their background.
- Motion respects `prefers-reduced-motion`. Live regions announce saves and errors.
