# Changelog

All notable changes to Bikespot are listed here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Export your spots to a file and import them again from Settings, so a cleared browser or
  a new phone no longer loses them. Import adds the spots from the file to Recent and
  says how many it added. Photos stay on the device and are not exported.
- After you save your first spot, the app asks the browser to keep its storage, so it is
  not cleared when the device runs low on space.
- A note under a photo when the app could not remove its location data. The photo never
  leaves your device either way.
- When saved data could not be read, Settings lets you export the copy the app kept as a
  text file, and clear it once you no longer need it. Clearing it also deletes the photos
  only that copy used.

### Fixed

- Station settings are kept on reload, even when no spot is saved yet.
- Switching between a station and an outside spot keeps your notes, GPS and photo.
- Text uses the app's own font when offline.
- Saving the same spot again with other notes updates it instead of adding a duplicate to
  Recent.
- A photo that fails to load shows nothing instead of a broken image.
- Input borders, switches, selected options and focus rings have enough contrast in light
  and dark mode, and the switch and selected option stay visible in high-contrast mode.
- Small buttons have a 44 px touch target.
- A failed save no longer deletes the photos of spots still stored on the device.
- An interrupted edit is no longer discarded by opening and closing another sheet before the
  editor.
- Saved spots that can no longer be read are no longer wiped without a word. The app says
  so, keeps a copy of the stored data on the device, and keeps the photos it refers to.

### Security

- The site sends a content security policy that allows only its own scripts and
  requests.

## [0.3.0] - 2026-08-24

### Added

- "Bike collected" clears a spot, and you can remove entries from Recent.
- The card shows how long ago you parked and has an "Open in Maps" action.

### Changed

- The first run starts empty instead of showing an example spot.
- Station settings apply as you change them, without a Save step.
- An edit you were making survives a reload for up to an hour.
- Save explains why it is blocked instead of doing nothing.

### Fixed

- Typing fast and saving straight away no longer drops characters.
- Notices are read out by screen readers, touch targets are 44 px, focus rings follow the
  theme, and the distance field explains itself inline.

## [0.2.0] - 2026-07-06

### Added

- A footer with the copyright line and the app version, linked to the source code.

## [0.1.2] - 2026-07-06

### Added

- System, light and dark themes.
- Photo previews in the location editor, with replace and remove.

### Fixed

- Photos left behind by deleted spots are cleaned up.
- Clearer labels in Recent, saving spots outside a station, and keyboard focus in
  dialogs.

## [0.1.1] - 2026-07-03

### Added

- Choose which fields your station uses (floor, lane, side, distance, rack level and
  number), each as quick-pick chips or free text.
- Optional GPS location, photo and notes for each spot.
- Recent spots, with a preview before you restore one.
- Install it as an app and use it offline.

[Unreleased]: https://github.com/simonvanlierde/bikespot/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/simonvanlierde/bikespot/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/simonvanlierde/bikespot/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/simonvanlierde/bikespot/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/simonvanlierde/bikespot/releases/tag/v0.1.1
