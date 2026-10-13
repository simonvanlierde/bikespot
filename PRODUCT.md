# Product

## Platform

web

## Users

Anyone who parks a bike at a big Dutch station bike park and has to find it again hours later. They save the spot with one hand while walking away from the bike, often outside in bright light. They read it back on the way in, with the bike park's own signs in view. The app names no station: each person sets up their own.

## Product Purpose

Bikespot remembers where you left your bike: the current spot, the last five spots, and how your station is laid out. It has done its job when you walk straight to the bike without searching the rows.

## Positioning

Bikespot describes the spot the way the bike park does (lane, side, rack level, distance from the entrance, floor, rack number), not as a pin on a map. GPS is optional. A note such as "next to the green bike" is part of what the spot is, not a comment on it. Everything stays on the device: there is no account and no server.

## Operating Context

- People save while walking away from the bike, so saving takes few taps and survives an interruption.
- People read the spot while walking back in, often with no signal underground or inside the bike park.
- A spot is either *in the station* or *outside*. In the station it has fields, and the lane is required when the station has lanes. Outside it is free text, and it needs a note, a photo or a GPS fix.
- Each person sets up their own station: its name, which fields the bike park has, and whether lane and floor are typed as numbers or picked from presets.

## Capabilities and Constraints

- A PWA that runs only in the browser. You can install it, it works offline, and it lives on one device on purpose. [docs/architecture.md](docs/architecture.md) covers storage, export and hosting.
- The app strips location data from photos where the browser allows it, and tells you when it could not.
- English and Dutch. The app picks one from the browser, and you can switch in Settings. Dutch uses its own adjective forms, not translated templates.
- Light, dark and system themes. Dark mode is for reading the spot outside at night, so it keeps the same contrast rules as light mode.
- Terms: *spot*, *current spot*, *recent locations*, *station*, *lane*, *side*, *rack level*, *rack number*, *bike collected*.

## Plans

- Planned: a map of the spots that have a GPS fix. It must work offline and send no spot to a map server.
- Not planned: sync between devices, because there is no server. Export and import move spots to a new phone.

## Brand Commitments

- Name: Bikespot.
- The look borrows from Dutch station wayfinding signs (see [DESIGN.md](DESIGN.md)).
- Voice: short, plain, second person ("Save where you leave your bike, and find it again later. Everything stays on this phone.").

## Evidence on Hand

- Screenshots: `docs/screenshots/home-light.png`, `docs/screenshots/home-dark.png`.
- We have no users, testimonials or usage data. Don't make any up.
- The first run shows no fake data: no parked bike, an empty history, and an empty state that explains the app.

## Product Principles

1. Finding the bike comes first. The current spot is the first and biggest thing on screen.
2. One hand, one glance. You can do everything with a thumb while walking, and you can read the spot at a glance in sunlight.
3. The device is the whole system. Nothing leaves it unless you export it or open the spot in Google Maps.
4. Use the bike park's words. The fields match the signs overhead, and you turn off the ones your station doesn't have.
5. Be honest. No sample data, no data lost without a word, and errors stay on screen until the next action.

## Accessibility & Inclusion

- The target is WCAG 2.2 AA.
- The tests run axe on the main view and on every overlay.
- Live regions announce saves and errors.
- The rules for touch-target size, contrast and motion are in [DESIGN.md](DESIGN.md#do).
