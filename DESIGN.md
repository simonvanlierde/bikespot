---
name: Bikespot
description: Where you parked, shown as a station sign.
colors:
  sign-blue: "#1d3d91"
  sign-blue-edge: "#16307a"
  sign-ink: "#ffffff"
  signal-yellow: "#ffc917"
  signal-ink: "#231d02"
  concrete: "#f2f4f7"
  surface: "#ffffff"
  surface-sunken: "#eceff4"
  ink: "#16233f"
  muted: "#5c6880"
  line: "#e1e5ec"
  control-edge: "#7a8496"
  danger: "#b5372a"
  danger-plate: "#ffe1dc"
  danger-plate-ink: "#5a1a10"
  night: "#0f1522"
  night-surface: "#1a2135"
  night-surface-sunken: "#141a2b"
  night-ink: "#e9edf5"
  night-muted: "#9aa4bb"
  night-line: "#2b3450"
  night-control-edge: "#6b7591"
  night-sign-blue: "#2450b4"
  night-sign-blue-edge: "#1d4098"
  night-selected: "#5b80e0"
  night-link: "#9db4f0"
  night-danger: "#f08d7e"
typography:
  display:
    fontFamily: "Overpass Variable, Segoe UI, sans-serif"
    fontSize: "clamp(2.85rem, 14vw, 4.4rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Overpass Variable, Segoe UI, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Overpass Variable, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "Overpass Mono Variable, ui-monospace, monospace"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
  stamp:
    fontFamily: "Overpass Mono Variable, ui-monospace, monospace"
    fontSize: "0.82rem"
rounded:
  control: "0.75rem"
  card: "1rem"
  sheet: "1.25rem"
  pill: "999px"
spacing:
  gutter: "0.95rem"
  stack: "1rem"
  card: "1.1rem"
  sign: "1.45rem"
  sign-wide: "1.9rem"
components:
  button-primary:
    backgroundColor: "{colors.sign-blue}"
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.control}"
    padding: "0.9rem 1rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.sign-blue-edge}"
  button-primary-on-sign:
    backgroundColor: "{colors.sign-ink}"
    textColor: "{colors.sign-blue}"
    rounded: "{rounded.control}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.9rem 1rem"
  segment-active:
    backgroundColor: "{colors.sign-blue}"
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.control}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.9rem 1rem"
    height: "3rem"
  current-card:
    backgroundColor: "{colors.sign-blue}"
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.sign}"
  notice:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.signal-ink}"
    rounded: "0.5rem"
    padding: "0.5rem 0.8rem"
  notice-error:
    backgroundColor: "{colors.danger-plate}"
    textColor: "{colors.danger-plate-ink}"
---

# Design System: Bikespot

## Overview

**Creative North Star: "Stationsbord"**

The interface borrows the signs of Dutch stations and their bike parks: deep sign blue, a white keyline set inside the panel, signal yellow, and heavy road-sign type. I draw the current spot as one of those signs, so the phone looks like the panels hanging over the bike park.

Everything else stays quiet. Secondary cards, sheets and forms sit on pale concrete surfaces with hairline borders, so the sign is the only loud thing on screen. There is little on each screen, and targets are large, because people use it with one hand outdoors.

The tokens are CSS custom properties in `src/styles/base.css`. The front matter lists the light palette plus the dark (`night-`) overrides. Four names differ in CSS: `sign-blue` is `--sign`, `sign-blue-edge` is `--sign-edge`, `signal-yellow` is `--signal` and `concrete` is `--bg`.

**Key Characteristics:**

- One sign-blue panel per screen, with a keyline inside it.
- Heavy, tight Overpass for the spot; Overpass Mono for labels, timestamps and counts.
- Flat surfaces with hairlines; only the sign and sheets have a shadow.
- Light and dark palettes, set in Settings or following the OS.

## Colors

Blue and concrete, with one yellow signal and one red for errors.

### Primary

- **Sign Blue** (`sign-blue`): the current-spot sign, primary buttons, the active segment and switches that are on. In dark mode a switch track and the edges of the active segment and primary buttons use the lighter `night-selected`, because night sign blue is below 3:1 against the surface. `sign-blue-edge` is the primary hover colour. In dark mode it gets brighter: `night-sign-blue`.

### Secondary

- **Signal Yellow** (`signal-yellow`): the save confirmation tag, text selection, and the focus ring in dark mode. Text on it uses `signal-ink`.

### Neutral

- **Concrete** (`concrete`): the page background, and also the light `theme-color` and the manifest background.
- **Surface** / **Surface Sunken**: cards and sheets; insets, notes, counts and hover fills.
- **Ink** / **Muted**: body text; kickers, hints and timestamps.
- **Line** / **Control Edge**: hairlines on cards, dividers and the detail list; the edge of every control (buttons, segments, inputs, the utility buttons, recent items, the footer link) and switch tracks, at least 3:1 against every surface.
- **Danger** with **Danger Plate**: error text and destructive outlines; the error notice.

### Named Rules

**The One Sign Rule.** A filled sign-blue panel appears once per screen, on the current spot. Anywhere else, sign blue is only for controls you act on.

**The Signal Rule.** Yellow fills only the save confirmation, which means "done". Apart from that it marks text selection and the dark-mode focus ring. It is never decoration and never a button.

**The Link Split Rule.** Sign blue works as a link colour on light surfaces only. Dark mode uses `night-link` for links and yellow for the focus ring, because a blue ring would disappear on blue buttons.

## Typography

**Display Font:** Overpass Variable (with Segoe UI, sans-serif)
**Label/Mono Font:** Overpass Mono Variable (with ui-monospace, monospace)

**Character:** Overpass is based on Highway Gothic, the US road-sign typeface, and that gives the sign its weight. The mono cut looks like the small object codes stamped on station signs. We host both fonts ourselves, with only the Latin subset, and precache them for offline use.

### Hierarchy

- **Display** (800, `clamp(2.85rem, 14vw, 4.4rem)`, 0.95): the spot headline on the sign ("Rack 42", "Lane 4"). An outside spot and the empty state drop to `clamp(1.85rem, 8vw, 2.7rem)`, because they are phrases, not markers.
- **Headline** (800, 1.55rem, 1.1): sheet titles. No eyebrow above them.
- **Body** (500, 1rem, 1.45): spot facts and summaries. Notes on the sign are 0.95rem and cut off after three lines.
- **Label** (mono 600, 0.72rem, 0.14em, uppercase): section kickers and the labels in detail rows.
- **Stamp** (mono, 0.82rem): timestamps and GPS accuracy. Counts (0.78rem) and the version chip (0.8rem) use the same mono face.

### Named Rules

**The Plate Rule.** The spot headline is the largest text in the app, and nothing competes with it. Long values wrap (`overflow-wrap: anywhere`, balanced) instead of shrinking.

## Layout

One column, `min(40rem, 100%)` wide and centred, with padding that respects the safe area (at least 0.95rem at the sides). The order is fixed: the sign, then two utility buttons (Recent locations, Settings), then a footer pushed to the bottom of the viewport.

Every other screen is a sheet (`min(34rem, 100%)` wide) over a dimmed backdrop. Below 640px a sheet sits in the centre of the viewport; at 640px and wider it sits near the top. It slides up as it opens, unless reduced motion is on. A sheet's submit row sticks to its bottom edge, so Save never scrolls behind the keyboard.

At 640px and wider, the sign's timestamp and actions share one row, and the sign padding grows from 1.45rem to 1.9rem. Below 640px the actions go full width, and the utility buttons and recent items stack.

## Elevation & Depth

Flat by default. Depth comes from tone (concrete, surface, sunken) and 1px hairlines. `base.css` has two shadow tokens:

- **Sign shadow** (`0 12px 28px rgba(29, 61, 145, 0.22)`; darker and neutral in dark mode): lifts the current-spot sign off the page.
- **Sheet shadow** (`0 -8px 32px rgba(14, 21, 34, 0.18)`): separates a sheet from the backdrop.

**The Two Shadows Rule.** Only the sign and sheets cast shadows, apart from a 1px drop under the switch knob. Cards, buttons and inputs stay flat.

## Shapes

Three radii: controls 0.75rem, cards 1rem, sheets 1.25rem. The notice tag uses 0.5rem. Counts and the add-preset button are pills. The sign's keyline is a 1.5px translucent white border, 0.45rem inside the edge, with its radius smaller by the same amount so the corners stay concentric. A reference photo on the sign gets the same keyline border.

## Components

### Current-Spot Sign

The main component: a sign-blue panel with the keyline inside, the spot headline, an optional square photo next to it (`clamp(5rem, 22vw, 8.5rem)`), facts separated by middle dots, the note, a mono timestamp, and actions. Tapping anywhere on the card opens the details sheet. A full-size button behind the content gives keyboard and screen-reader users the same way in. With no spot saved, it shows an empty state and the save action.

### Buttons

- **Shape:** control radius (0.75rem), at least 2.75rem tall.
- **Primary:** sign blue with white text, weight 700.
- **On the sign:** the colours swap to a white plate with sign-blue text. The Maps link next to it has a tonal white fill (16% opacity) and a keyline-coloured edge, which keeps 3:1 against the sign.
- **Ghost:** transparent with a `control-edge` border; the danger version uses a danger border and danger text.
- **Hover / Active:** a sunken fill for ghost buttons, `sign-blue-edge` for primary; a 0.985 scale on press and 150ms colour transitions, both off under reduced motion.

### Segmented Controls

A grid of outlined segments inside a bordered fieldset. The active segment is filled sign blue, with a `night-selected` edge in dark mode. Used for station/outside, side, rack level, distance, theme and language.

### Inputs / Fields

- **Style:** a bold label above an input filled with the surface colour, with a `control-edge` border and the control radius, at least 3rem tall.
- **Focus:** a 2px `focus-ring` outline, offset 2px (sign blue in light mode, signal yellow in dark mode).
- **Error:** a danger border, plus a danger message in a live region.

### Switches

A pill track of 2.75rem by 1.6rem in `control-edge` that turns sign blue when on (`night-selected` in dark mode, at least 3:1 against every surface), with a white knob.

### Detail List

Like a departures board: the label on the left in mono uppercase, the value on the right in bold, hairlines between rows, all inside a bordered box.

### Notices

The save confirmation is a small signal-yellow tag. It goes away by itself after a few seconds. Errors use the danger plate and stay until the next action replaces them.

## Do's and Don'ts

### Do

- **Do** keep the current-spot sign as the only filled sign-blue panel, with its keyline inside.
- **Do** take every colour from the tokens, and change both dark-mode blocks together.
- **Do** keep touch targets at 2.75rem (44px) or more, and control edges at 3:1 contrast against their background. A small link can keep its look and get the 44px height from an invisible hit area, as the footer version link does.
- **Do** set kickers, timestamps and counts in Overpass Mono, and use uppercase only for kickers.
- **Do** wrap motion in `prefers-reduced-motion: no-preference`.

### Don't

- **Don't** use signal yellow for buttons, links or decoration.
- **Don't** add shadows to cards, buttons or inputs.
- **Don't** use sign blue as a link or focus colour in dark mode.
- **Don't** shrink the spot headline to fit; let it wrap.
- **Don't** load fonts or assets from the network at runtime: the app has to work offline.
