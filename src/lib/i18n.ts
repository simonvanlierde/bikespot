import { computed, effect, signal } from "@preact/signals";

import type { Distance, RackLevel, Side } from "./app-data";

// Lean i18n: no framework. A `lang` signal (persisted, auto-detected) plus a
// `t` computed that swaps the whole string table. Mirrors theme.ts. Reading
// `t.value.x` in render subscribes the component, so a language switch
// re-renders everything. i18next earns its keep at hundreds of strings or ICU
// plurals — this app has neither.
export type Lang = "en" | "nl";
export const LANGS: Lang[] = ["en", "nl"];

// Segmented-control option values, kept as key unions so a missing translation
// in either language is a type error rather than a silent `undefined` at render.
export type OptKey = Distance | Side | RackLevel;
type ThemeKey = "system" | "light" | "dark";

const STORAGE_KEY = "bikespot-lang";

function detectLang(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "nl") {
      return stored;
    }
  } catch {
    // Storage blocked (private mode): fall through to browser preference.
  }
  return navigator.language?.slice(0, 2) === "nl" ? "nl" : "en";
}

export const lang = signal<Lang>(detectLang());

// Reflect onto <html lang> (screen readers, spell-check) and persist. Runs on
// import so the attribute is set before first render.
effect(() => {
  document.documentElement.lang = lang.value;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang.value);
  } catch {
    // Storage blocked: choice still applies for this session.
  }
});

export function setLang(next: Lang): void {
  lang.value = next;
}

// Record<string,string> for the option groups so callers can index by a plain
// enum value without a cast; the trade-off is en/nl aren't key-checked against
// each other, so keep them in sync by hand (they're short).
type Dict = {
  currentSpot: string;
  hasGps: string;
  viewDetails: string;
  changeLocation: string;
  updated: (time: string) => string;
  saved: (time: string) => string;
  currentBikeRef: string;
  navigation: string;
  noSpotYet: string;
  emptyIntro: string;
  saveSpot: string;
  justNow: string;
  bikeCollected: string;
  removeFromRecent: string;
  noRecentYet: string;
  recentLocations: string;
  settings: string;

  cancel: string;
  back: string;
  whereParked: string;
  whereOpts: Record<"station" | "outside", string>;
  saveLocation: string;
  errorLaneRequired: string;
  errorNothingToFindBy: string;
  moreDetails: string;
  gpsLocation: string;
  notes: string;
  photo: string;
  floor: string;
  lane: string;
  distance: string;
  distanceHelpText: string;
  side: string;
  rackLevel: string;
  rackNumber: string;
  opts: Record<OptKey, string>;

  locating: string;
  updateLocation: string;
  useMyLocation: string;
  captured: string;
  accuracy: (value: string) => string;
  geoError: string;

  photoPreviewAlt: string;
  replacePhoto: string;
  addPhoto: string;
  removePhoto: string;
  photoMetadataKept: string;

  close: string;

  locationDetails: string;
  savedBikeRef: string;
  recentBikeRef: string;
  recentPreview: string;
  openInMaps: string;
  stationFloor: string;
  useThisLocation: string;
  viewRecent: (title: string) => string;

  station: string;
  stationName: string;
  stationNamePlaceholder: string;
  general: string;
  enabledFields: string;
  floorInput: string;
  laneInput: string;
  theme: string;
  themeOpts: Record<ThemeKey, string>;
  numberInput: string;
  quickMode: Record<"lane" | "floor", string>;
  presetLabel: (noun: string, n: number) => string;
  removePreset: (noun: string, n: number) => string;
  addPreset: (noun: string) => string;

  outsideStation: string;
  bikeSpot: string;
  // Callers guard these with shouldShowEntryField, so the value is always set;
  // typed optional only to satisfy LocationRecord's `string | undefined` fields.
  rackN: (n?: string) => string;
  laneN: (n?: string) => string;
  stationFloorN: (n?: string) => string;
  factDistance: (value: string) => string;
  // Take the raw key, not the display word: Dutch needs per-value adjectival
  // forms (linkerkant, onderste rek) that a shared prefix can't produce.
  factSide: (side: Side) => string;
  factRack: (level: RackLevel) => string;
  notSaved: string;

  noticeSaveFailed: string;
  noticeDataUnreadable: string;
  noticeSomeDataUnreadable: string;
  noticeLocationUpdated: string;
  noticeLocationReplaced: string;
  noticeCollected: string;
  noticeRecentRemoved: string;
  noticeRecentRestored: string;
  undo: string;
  noticeLocationFromRecent: string;
  noticeDataCleared: string;
  clearAllData: string;
  exportSpots: string;
  importSpots: string;
  exportUnreadable: string;
  clearUnreadable: string;
  clearUnreadableConfirm: string;
  noticeImported: (count: number) => string;
  noticeImportInvalid: string;
  clearAllDataConfirm: string;
  viewSourceVersion: (version: string) => string;

  language: string;
  langOpts: Record<Lang, string>;
};

const en: Dict = {
  currentSpot: "Current spot",
  hasGps: "Has GPS location",
  viewDetails: "View details",
  changeLocation: "Change spot",
  updated: (time) => `Updated ${time}`,
  saved: (time) => `Saved ${time}`,
  currentBikeRef: "Current bike reference",
  navigation: "More",
  noSpotYet: "No bike parked",
  emptyIntro:
    "Save where you leave your bike, and find it again later. Everything stays on this phone.",
  saveSpot: "Save spot",
  justNow: "just now",
  bikeCollected: "Bike collected",
  removeFromRecent: "Remove from Recent",
  noRecentYet: "Earlier spots show up here once you save a new one.",
  recentLocations: "Recent locations",
  settings: "Settings",

  cancel: "Cancel",
  back: "Back",
  whereParked: "Parked",
  whereOpts: { station: "In the station", outside: "Outside" },
  saveLocation: "Save",
  errorLaneRequired: "Enter the lane so you can find the bike again.",
  errorNothingToFindBy: "Add a note, photo or GPS fix so you can find the bike again.",
  moreDetails: "More details",
  gpsLocation: "GPS location",
  notes: "Notes",
  photo: "Photo",
  floor: "Floor",
  lane: "Lane",
  distance: "Distance",
  distanceHelpText: "Close = near the entrance. Middle = around the middle. Far = deeper inside.",
  side: "Side",
  rackLevel: "Rack level",
  rackNumber: "Rack number",
  opts: {
    close: "Close",
    middle: "Middle",
    far: "Far",
    left: "Left",
    right: "Right",
    top: "Top",
    bottom: "Bottom",
  },

  locating: "Locating…",
  updateLocation: "Update location",
  useMyLocation: "Use my location",
  captured: "Captured",
  accuracy: (value) => `${value} accuracy`,
  geoError: "Couldn’t get your location. Check permissions and try again.",

  photoPreviewAlt: "Bike reference preview",
  replacePhoto: "Replace photo",
  addPhoto: "Add photo",
  removePhoto: "Remove photo",
  photoMetadataKept:
    "This browser could not remove the photo's location data. The photo stays on this device.",

  close: "Close",

  locationDetails: "Spot details",
  savedBikeRef: "Saved bike reference",
  recentBikeRef: "Recent bike reference",
  recentPreview: "Recent location preview",
  openInMaps: "Open in Maps",
  stationFloor: "Station floor",
  useThisLocation: "Restore this spot",
  viewRecent: (title) => `View ${title}`,

  station: "Station",
  stationName: "Station name",
  stationNamePlaceholder: "e.g. Utrecht Centraal",
  general: "General",
  enabledFields: "Which details does your station have?",
  floorInput: "Floor input",
  laneInput: "Lane input",
  theme: "Theme",
  themeOpts: { system: "System", light: "Light", dark: "Dark" },
  numberInput: "Number input",
  quickMode: { lane: "Preset lanes", floor: "Preset floors" },
  presetLabel: (noun, n) => `${noun} ${n}`,
  removePreset: (noun, n) => `Remove ${noun} ${n}`,
  addPreset: (noun) => `Add ${noun}`,

  outsideStation: "Outside the station",
  bikeSpot: "Bike spot",
  rackN: (n) => `Rack ${n}`,
  laneN: (n) => `Lane ${n}`,
  stationFloorN: (n) => `Station floor ${n}`,
  factDistance: (value) => `${value} distance`,
  factSide: (side) => (side === "left" ? "Left side" : "Right side"),
  factRack: (level) => (level === "top" ? "Top rack" : "Bottom rack"),
  notSaved: "not saved yet",

  noticeSaveFailed: "Could not save — storage is full or blocked",
  noticeDataUnreadable:
    "Your saved spots and settings could not be read — a copy is kept on this device; export it from Settings",
  noticeSomeDataUnreadable:
    "Some saved spots could not be read — a copy is kept on this device; export it from Settings",
  noticeLocationUpdated: "Spot saved",
  noticeLocationReplaced: "Spot saved — the previous one is in Recent",
  noticeCollected: "Spot cleared — kept in Recent",
  noticeRecentRemoved: "Removed from Recent",
  noticeRecentRestored: "Back in Recent",
  undo: "Undo",
  noticeLocationFromRecent: "Earlier spot restored",
  noticeDataCleared: "All data cleared",
  clearAllData: "Clear all data",
  exportSpots: "Export spots",
  importSpots: "Import spots",
  exportUnreadable: "Export unreadable data",
  clearUnreadable: "Clear unreadable data",
  clearUnreadableConfirm:
    "Clear the copy of the unreadable data from this device, with the photos only it refers to? Export it first to keep it.",
  noticeImported: (count) => (count === 1 ? "1 spot imported" : `${count} spots imported`),
  noticeImportInvalid: "Not a Bikespot export file — nothing imported",
  clearAllDataConfirm: "Clear all saved spots, photos and settings from this device?",
  viewSourceVersion: (version) => `View source code, version ${version}`,

  language: "Language",
  langOpts: { en: "English", nl: "Nederlands" },
};

const nl: Dict = {
  currentSpot: "Huidige plek",
  hasGps: "Heeft GPS-locatie",
  viewDetails: "Details bekijken",
  changeLocation: "Plek wijzigen",
  updated: (time) => `Bijgewerkt ${time}`,
  saved: (time) => `Opgeslagen ${time}`,
  currentBikeRef: "Huidige fietsreferentie",
  navigation: "Meer",
  noSpotYet: "Geen fiets gestald",
  emptyIntro:
    "Sla op waar je je fiets achterlaat en vind hem later terug. Alles blijft op deze telefoon.",
  saveSpot: "Plek opslaan",
  justNow: "zojuist",
  bikeCollected: "Fiets opgehaald",
  removeFromRecent: "Uit Recent verwijderen",
  noRecentYet: "Eerdere plekken verschijnen hier zodra je een nieuwe opslaat.",
  recentLocations: "Recente locaties",
  settings: "Instellingen",

  cancel: "Annuleren",
  back: "Terug",
  whereParked: "Gestald",
  whereOpts: { station: "In de stalling", outside: "Buiten" },
  saveLocation: "Opslaan",
  errorLaneRequired: "Vul de rij in, zodat je de fiets terugvindt.",
  errorNothingToFindBy: "Voeg een notitie, foto of GPS-locatie toe, zodat je de fiets terugvindt.",
  moreDetails: "Meer details",
  gpsLocation: "GPS-locatie",
  notes: "Notities",
  photo: "Foto",
  floor: "Verdieping",
  lane: "Rij",
  distance: "Afstand",
  distanceHelpText: "Dichtbij = bij de ingang. Midden = rond het midden. Ver = dieper naar binnen.",
  side: "Kant",
  rackLevel: "Rekniveau",
  rackNumber: "Reknummer",
  opts: {
    close: "Dichtbij",
    middle: "Midden",
    far: "Ver",
    left: "Links",
    right: "Rechts",
    top: "Boven",
    bottom: "Onder",
  },

  locating: "Locatie zoeken…",
  updateLocation: "Locatie bijwerken",
  useMyLocation: "Mijn locatie gebruiken",
  captured: "Vastgelegd",
  accuracy: (value) => `${value} nauwkeurigheid`,
  geoError: "Kon je locatie niet ophalen. Controleer de rechten en probeer opnieuw.",

  photoPreviewAlt: "Voorbeeld fietsreferentie",
  replacePhoto: "Foto vervangen",
  addPhoto: "Foto toevoegen",
  removePhoto: "Foto verwijderen",
  photoMetadataKept:
    "Deze browser kon de locatiegegevens niet uit de foto halen. De foto blijft op dit apparaat.",

  close: "Sluiten",

  locationDetails: "Plekdetails",
  savedBikeRef: "Opgeslagen fietsreferentie",
  recentBikeRef: "Recente fietsreferentie",
  recentPreview: "Voorbeeld recente locatie",
  openInMaps: "Openen in Maps",
  stationFloor: "Verdieping stalling",
  useThisLocation: "Deze plek herstellen",
  viewRecent: (title) => `${title} bekijken`,

  station: "Stalling",
  stationName: "Naam van de stalling",
  stationNamePlaceholder: "bv. Utrecht Centraal",
  general: "Algemeen",
  enabledFields: "Welke details heeft jouw stalling?",
  floorInput: "Invoer verdieping",
  laneInput: "Invoer rij",
  theme: "Thema",
  themeOpts: { system: "Systeem", light: "Licht", dark: "Donker" },
  numberInput: "Cijferinvoer",
  quickMode: { lane: "Vaste rijen", floor: "Vaste verdiepingen" },
  presetLabel: (noun, n) => `${noun} ${n}`,
  removePreset: (noun, n) => `${noun} ${n} verwijderen`,
  addPreset: (noun) => `${noun} toevoegen`,

  outsideStation: "Buiten de stalling",
  bikeSpot: "Fietsplek",
  rackN: (n) => `Rek ${n}`,
  laneN: (n) => `Rij ${n}`,
  stationFloorN: (n) => `Verdieping ${n}`,
  factDistance: (value) => `Afstand ${value.toLowerCase()}`,
  factSide: (side) => (side === "left" ? "Linkerkant" : "Rechterkant"),
  factRack: (level) => (level === "top" ? "Bovenste rek" : "Onderste rek"),
  notSaved: "nog niet opgeslagen",

  noticeSaveFailed: "Kon niet opslaan — opslag vol of geblokkeerd",
  noticeDataUnreadable:
    "Je opgeslagen plekken en instellingen konden niet worden gelezen — er staat een kopie op dit apparaat; exporteer die via Instellingen",
  noticeSomeDataUnreadable:
    "Sommige opgeslagen plekken konden niet worden gelezen — er staat een kopie op dit apparaat; exporteer die via Instellingen",
  noticeLocationUpdated: "Plek opgeslagen",
  noticeLocationReplaced: "Plek opgeslagen — de vorige staat bij Recent",
  noticeCollected: "Plek gewist — bewaard bij Recent",
  noticeRecentRemoved: "Uit Recent verwijderd",
  noticeRecentRestored: "Terug bij Recent",
  undo: "Ongedaan maken",
  noticeLocationFromRecent: "Eerdere plek hersteld",
  noticeDataCleared: "Alle gegevens gewist",
  clearAllData: "Alle gegevens wissen",
  exportSpots: "Plekken exporteren",
  importSpots: "Plekken importeren",
  exportUnreadable: "Onleesbare gegevens exporteren",
  clearUnreadable: "Onleesbare gegevens wissen",
  clearUnreadableConfirm:
    "De kopie van de onleesbare gegevens van dit apparaat wissen, met de foto's waar alleen die kopie naar verwijst? Exporteer hem eerst als je hem wilt bewaren.",
  noticeImported: (count) =>
    count === 1 ? "1 plek geïmporteerd" : `${count} plekken geïmporteerd`,
  noticeImportInvalid: "Geen Bikespot-exportbestand — niets geïmporteerd",
  clearAllDataConfirm: "Alle opgeslagen plekken, foto's en instellingen van dit apparaat wissen?",
  viewSourceVersion: (version) => `Broncode bekijken, versie ${version}`,

  language: "Taal",
  langOpts: { en: "English", nl: "Nederlands" },
};

const dict: Record<Lang, Dict> = { en, nl };

export const t = computed(() => dict[lang.value]);
