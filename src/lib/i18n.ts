import { computed, effect, signal } from "@preact/signals";

// Lean i18n: no framework. A `lang` signal (persisted, auto-detected) plus a
// `t` computed that swaps the whole string table. Mirrors theme.ts. Reading
// `t.value.x` in render subscribes the component, so a language switch
// re-renders everything. i18next earns its keep at hundreds of strings or ICU
// plurals — this app has neither.
export type Lang = "en" | "nl";
export const LANGS: Lang[] = ["en", "nl"];

// Segmented-control option values, kept as key unions so a missing translation
// in either language is a type error rather than a silent `undefined` at render.
export type OptKey = "close" | "middle" | "far" | "left" | "right" | "top" | "bottom";
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
  quickActions: string;
  recentLocations: string;
  settings: string;

  cancel: string;
  parkedOutside: string;
  backToStation: string;
  saveLocation: string;
  moreDetails: string;
  gpsLocation: string;
  notes: string;
  photo: string;
  floor: string;
  lane: string;
  distance: string;
  distanceHelp: string;
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

  close: string;
  closeDetails: string;
  backToRecent: string;

  locationDetails: string;
  savedBikeRef: string;
  recentBikeRef: string;
  recentPreview: string;
  openInMaps: string;
  stationFloor: string;
  useThisLocation: string;
  restore: (title: string) => string;

  station: string;
  general: string;
  enabledFields: string;
  saveStationSettings: string;
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
  factSide: (side: "left" | "right") => string;
  factRack: (level: "top" | "bottom") => string;
  notSaved: string;

  noticeSaveFailed: string;
  noticeLocationUpdated: string;
  noticeStationUpdated: string;
  noticeLocationFromRecent: string;
  noticeLoadFailed: string;
  noticeDataCleared: string;
  clearAllData: string;
  clearAllDataConfirm: string;
  viewSourceVersion: (version: string) => string;

  language: string;
  langOpts: Record<Lang, string>;

  // First-run seed data (see defaults.ts); user overwrites it immediately.
  seedStationName: string;
  seedStarterNote: string;
};

const en: Dict = {
  currentSpot: "Current spot",
  hasGps: "Has GPS location",
  viewDetails: "View details",
  changeLocation: "Change location",
  updated: (time) => `Updated ${time}`,
  saved: (time) => `Saved ${time}`,
  currentBikeRef: "Current bike reference",
  quickActions: "Quick actions",
  recentLocations: "Recent locations",
  settings: "Settings",

  cancel: "Cancel",
  parkedOutside: "Parked outside",
  backToStation: "Back to station",
  saveLocation: "Save location",
  moreDetails: "More details",
  gpsLocation: "GPS location",
  notes: "Notes",
  photo: "Photo",
  floor: "Floor",
  lane: "Lane",
  distance: "Distance",
  distanceHelp: "Distance help",
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
  addPhoto: "Add a photo",
  removePhoto: "Remove photo",

  close: "Close",
  closeDetails: "Close details",
  backToRecent: "Back to recent locations",

  locationDetails: "Location details",
  savedBikeRef: "Saved bike reference",
  recentBikeRef: "Recent bike reference",
  recentPreview: "Recent location preview",
  openInMaps: "Open in Maps",
  stationFloor: "Station floor",
  useThisLocation: "Use this location",
  restore: (title) => `Restore ${title} from recent locations`,

  station: "Station",
  general: "General",
  enabledFields: "Enabled fields",
  saveStationSettings: "Save station settings",
  floorInput: "Floor input",
  laneInput: "Lane input",
  theme: "Theme",
  themeOpts: { system: "System", light: "Light", dark: "Dark" },
  numberInput: "Number input",
  quickMode: { lane: "Quick lanes", floor: "Quick floors" },
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
  noticeLocationUpdated: "Location updated",
  noticeStationUpdated: "Station settings updated",
  noticeLocationFromRecent: "Location updated from recent",
  noticeLoadFailed: "Could not read saved data — starting fresh",
  noticeDataCleared: "All data cleared",
  clearAllData: "Clear all data",
  clearAllDataConfirm: "Delete all saved locations, photos and settings from this device?",
  viewSourceVersion: (version) => `View source code, version ${version}`,

  language: "Language",
  langOpts: { en: "English", nl: "Nederlands" },

  seedStationName: "My station",
  seedStarterNote: "Starter spot - update this to your real location.",
};

const nl: Dict = {
  currentSpot: "Huidige plek",
  hasGps: "Heeft GPS-locatie",
  viewDetails: "Details bekijken",
  changeLocation: "Locatie wijzigen",
  updated: (time) => `Bijgewerkt ${time}`,
  saved: (time) => `Opgeslagen ${time}`,
  currentBikeRef: "Huidige fietsreferentie",
  quickActions: "Snelle acties",
  recentLocations: "Recente locaties",
  settings: "Instellingen",

  cancel: "Annuleren",
  parkedOutside: "Buiten geparkeerd",
  backToStation: "Terug naar stalling",
  saveLocation: "Locatie opslaan",
  moreDetails: "Meer details",
  gpsLocation: "GPS-locatie",
  notes: "Notities",
  photo: "Foto",
  floor: "Verdieping",
  lane: "Rij",
  distance: "Afstand",
  distanceHelp: "Uitleg afstand",
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

  close: "Sluiten",
  closeDetails: "Details sluiten",
  backToRecent: "Terug naar recente locaties",

  locationDetails: "Locatiedetails",
  savedBikeRef: "Opgeslagen fietsreferentie",
  recentBikeRef: "Recente fietsreferentie",
  recentPreview: "Voorbeeld recente locatie",
  openInMaps: "Openen in Maps",
  stationFloor: "Verdieping stalling",
  useThisLocation: "Deze locatie gebruiken",
  restore: (title) => `${title} herstellen uit recente locaties`,

  station: "Stalling",
  general: "Algemeen",
  enabledFields: "Ingeschakelde velden",
  saveStationSettings: "Stallinginstellingen opslaan",
  floorInput: "Invoer verdieping",
  laneInput: "Invoer rij",
  theme: "Thema",
  themeOpts: { system: "Systeem", light: "Licht", dark: "Donker" },
  numberInput: "Cijferinvoer",
  quickMode: { lane: "Snelkeuze rijen", floor: "Snelkeuze verdiepingen" },
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
  noticeLocationUpdated: "Locatie bijgewerkt",
  noticeStationUpdated: "Stallinginstellingen bijgewerkt",
  noticeLocationFromRecent: "Locatie bijgewerkt vanuit recent",
  noticeLoadFailed: "Kon opgeslagen gegevens niet lezen — opnieuw begonnen",
  noticeDataCleared: "Alle gegevens gewist",
  clearAllData: "Alle gegevens wissen",
  clearAllDataConfirm:
    "Alle opgeslagen locaties, foto's en instellingen van dit apparaat verwijderen?",
  viewSourceVersion: (version) => `Broncode bekijken, versie ${version}`,

  language: "Taal",
  langOpts: { en: "English", nl: "Nederlands" },

  seedStationName: "Mijn stalling",
  seedStarterNote: "Voorbeeldplek – wijzig dit naar je echte locatie.",
};

const dict: Record<Lang, Dict> = { en, nl };

export const t = computed(() => dict[lang.value]);
