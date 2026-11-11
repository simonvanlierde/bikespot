# Product

## Platform

web

## Users

Station commuters come first: people who repeatedly park at a large station bike park and have to find their bike again hours later. People parking elsewhere are the next audience. They save the spot with one hand while walking away from the bike, often outside in bright light. They read it back on the way in, with the bike park's own signs in view. The app names no station: each person sets up their own.

## Mission and Vision

**Mission:** Save your spot quickly. Find your bike at a glance.

**Vision:** Make large station bike parks easy to use, then bring that clarity to bike parking anywhere.

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

- A PWA that runs only in the browser. You can install it, it works offline, and currently keeps its data on one device. [docs/architecture.md](docs/architecture.md) covers storage, export and hosting.
- The app strips location data from photos where the browser allows it, and tells you when it could not.
- English, Dutch, German, French, Danish, Swedish and Japanese. The app picks the first of your browser languages it has, and you can switch in Settings. Each language words the spot details as a whole phrase (Dutch adjective forms, "nah am Eingang"), not a translated template. Japanese uses the system's Japanese font, since Overpass covers Latin only.
- Light, dark and system themes. Dark mode is for reading the spot outside at night, so it keeps the same contrast rules as light mode.
- Terms: *spot*, *current spot*, *recent locations*, *station*, *lane*, *side*, *rack level*, *rack number*, *bike collected*.

## Plans

- Built: a schematic map of the spots that have a GPS fix, with the distance and direction from you to the current spot. It is drawn on the device with no map tiles, so it works offline and sends no spot to a map server. "Open in Maps" stays the way out to a real map.
- After 0.4.0, in order: a return view with prominent lane, rack, floor and photo plus an offline saved-lane diagram; an outdoor street map; faster repeat saving; then multiple station profiles.
- The lane diagram uses saved lane, side and near/middle/far details where known, with floor and rack level as labels. Unknown details stay unspecified. It is a schematic, not a measured station plan, and needs no GPS fix.
- The outdoor map will help find the saved bike using its pin, current position when available, and nearby streets. Its basemap starts online, with tiles requested only when the map opens. A first-use explanation will describe the provider receiving the IP address and requested map area. Saved details, photos and the existing GPS schematic remain available offline. Provider selection must account for attribution, caching and referrer requirements; offline tile downloads are outside the initial scope.
- Research whole-station maps alongside this work, starting with NS, then municipal and other open sources including OpenStreetMap. Leiden and Utrecht are the pilots. Ship each map only with verified layout, freshness and reuse rights; keep the lane diagram elsewhere. Users will not draw or upload station maps.
- Stay offline first. Optional sync may be explored later; the current app has no account or sync service. Export and import move spot details to a new phone.

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
3. Offline comes first. Spot data stays on your device unless you export it or open the spot in Google Maps.
4. Use the bike park's words. The fields match the signs overhead, and you turn off the ones your station doesn't have.
5. Be honest. No sample data, no data lost without a word, and errors stay on screen until the next action.

## Accessibility & Inclusion

- The target is WCAG 2.2 AA.
- The tests run axe on the main view and on every overlay.
- Live regions announce saves and errors.
- The rules for touch-target size, contrast and motion are in [DESIGN.md](DESIGN.md#do).
