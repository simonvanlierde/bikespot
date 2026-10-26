# Changelog

All notable changes to Bikespot are listed here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- German, French, Danish, Swedish and Japanese, next to English and Dutch. The app picks
  the first of your browser languages it knows, and Settings now has a language list
  instead of two buttons. Dates, times and distances follow the language you choose.
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
- Undo after removing a spot from Recent, for 10 seconds. The spot comes back in its old
  place, with its photo.
- When you save a spot, the sign's values flip in once, like a station departure board.
  It takes about half a second and does not run when your device asks for reduced motion.
- A spot map that shows your current and recent spots with a GPS location, placed against
  each other with a scale bar. Tap "Show where I am" to see how far your bike is and in
  which direction, such as "120 m north-east". It updates as you walk, and shows which way
  your phone points where the phone can tell. Without a GPS signal yet, such as
  underground, it says so and keeps looking. The map is drawn on the phone: it works
  offline and sends no spot anywhere.

### Changed

- Photos are saved at 1600 px on the long side instead of full size, so a phone photo
  of 2 MB now takes about 80 KB. Photos the browser cannot open, such as HEIC on most
  browsers, are kept as they are, with the note that their location data stayed.
- Button labels and notices use one verb per action, in English and Dutch: "Save spot",
  "Change spot", "Restore this spot", and "imported" for spots from a file.

### Fixed

- Escape closes a sheet, such as the spot map, also when you press it right after you
  open the sheet. Before, a quick press was missed and the sheet stayed open, most often
  on a touch screen with a keyboard.
- In the preview of a recent spot, keyboard focus stays where you put it. Before, the
  sheet could pull focus back to itself whenever the app redrew, so a keyboard or
  screen-reader user lost their place.
- On a narrow phone, the Save spot sheet no longer scrolls sideways once you open More
  details. The hidden photo pickers behind Take photo and Add photo took the full width
  of the sheet and stuck out past its edge.
- On a phone or tablet, a Take photo button opens the camera, also on a tablet with a
  keyboard or mouse attached. Chrome on Android had stopped offering the camera from Add
  photo, which now opens the gallery only.
- When you pick a second photo while the first is still being prepared, the spot keeps
  the second one. Before, a large camera photo that finished last could replace it.
- In French the off-map marker says "Toi, hors de la carte" instead of just "Toi", and the Japanese station question asks which details the bike park has.
- More translation fixes after a second review in Dutch, French, German, Danish, Swedish and Japanese: clearer map and empty-screen text, and notices that read naturally.
- Translation fixes after a review in Dutch, French, German, Danish and
  Swedish. In French, the "Close" distance option is now "Proche".
- On wider screens, "Change spot" no longer runs past the right edge of the sign when the
  spot has a GPS location.
- Station settings are kept on reload, even when no spot is saved yet.
- Switching between a station and an outside spot keeps your notes, GPS and photo.
- Text uses the app's own font when offline.
- Saving the same spot again with other notes updates it instead of adding a duplicate to
  Recent.
- A photo that fails to load shows nothing instead of a broken image.
- Saving right after picking a photo keeps the photo. Before, a spot saved while the
  photo was still being prepared was stored without it.
- Input borders, switches, selected options and focus rings have enough contrast in light
  and dark mode, and the switch and selected option stay visible in high-contrast mode.
- Small buttons have a 44 px touch target.
- A failed save no longer deletes the photos of spots still stored on the device.
- An interrupted edit is no longer discarded by opening and closing another sheet before the
  editor.
- Saved spots that can no longer be read are no longer wiped without a word. The app says
  so, keeps a copy of the stored data on the device, and keeps the photos it refers to.
- Photos of spots pushed out of Recent by an import are deleted right away instead of on
  the next start.
- Buttons, segments and list items have an outline with at least 3:1 contrast in light and
  dark mode.
- "Clear all data" shows its red outline again.
- On the spot map, the arrow for the way your phone points is right when you hold the
  phone sideways. Before, it was a quarter turn off in landscape.

### Security

- The site sends a content security policy that allows only its own scripts and
  requests.
- The policy no longer allows any inline script. The site also tells browsers to load it
  over HTTPS only, sends no referrer when you follow a link out, keeps other sites'
  windows and pages from reaching it, and turns off camera access from the page. Taking
  a photo for a spot still works.

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
