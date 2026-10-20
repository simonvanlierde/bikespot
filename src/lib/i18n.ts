import { computed, effect, signal } from "@preact/signals";
import type { Distance, RackLevel, Side } from "./app-data";
import type { Compass } from "./geo";

// Lean i18n: no framework. A `lang` signal (persisted, auto-detected) plus a
// `t` computed that swaps the whole string table. Mirrors theme.ts. Reading
// `t.value.x` in render subscribes the component, so a language switch
// re-renders everything. i18next earns its keep at hundreds of strings or ICU
// plurals — this app has neither.
export const LANGS = ["en", "nl", "de", "fr", "da", "sv", "ja"] as const;
export type Lang = (typeof LANGS)[number];

// Each language named in itself, so a reader finds theirs whatever the UI
// language is. Not part of Dict: the names don't change with the UI language.
export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  nl: "Nederlands",
  de: "Deutsch",
  fr: "Français",
  da: "Dansk",
  sv: "Svenska",
  ja: "日本語",
};

// Segmented-control option values, kept as key unions so a missing translation
// in any language is a type error rather than a silent `undefined` at render.
export type OptKey = Distance | Side | RackLevel;
type ThemeKey = "system" | "light" | "dark";

const STORAGE_KEY = "bikespot-lang";

const isLang = (value: string | null | undefined): value is Lang =>
  (LANGS as readonly string[]).includes(value ?? "");

// A stored choice wins; otherwise the first browser language whose primary
// subtag we have ("de-AT" -> de, "ja-JP" -> ja); otherwise English.
export function detectLang(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) {
      return stored;
    }
  } catch {
    // Storage blocked (private mode): fall through to browser preference.
  }
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const primary = tag?.split("-")[0].toLowerCase();
    if (isLang(primary)) {
      return primary;
    }
  }
  return "en";
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

// Every language is typed `Dict`, so a missing or misspelled key, including
// one inside an option group, is a compile error.
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
  spotMap: string;
  mapIntro: string;
  mapNoGps: string;
  mapCurrentNoGps: string;
  mapLabel: (count: number) => string;
  showMyPosition: string;
  locatingYou: string;
  noSignal: string;
  positionError: string;
  toYourBike: string;
  you: string;
  youOffMap: string;
  atYourBike: string;
  // "120 m north-east": the way from you to the bike.
  towards: (distance: string, direction: Compass) => string;
  // "Lane 5: 40 m south-west of the current spot".
  fromCurrent: (label: string, distance: string, direction: Compass) => string;
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
  // Take the raw key, not the display word: Dutch needs per-value adjectival
  // forms (linkerkant, onderste rek) and other languages whole phrases
  // ("nah am Eingang") that a shared prefix can't produce.
  factDistance: (distance: Distance) => string;
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
};

const COMPASS_EN: Record<Compass, string> = {
  n: "north",
  ne: "north-east",
  e: "east",
  se: "south-east",
  s: "south",
  sw: "south-west",
  w: "west",
  nw: "north-west",
};

// The -en forms, for "naar het noordoosten" and "ten noordoosten van".
const COMPASS_NL: Record<Compass, string> = {
  n: "noorden",
  ne: "noordoosten",
  e: "oosten",
  se: "zuidoosten",
  s: "zuiden",
  sw: "zuidwesten",
  w: "westen",
  nw: "noordwesten",
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
  spotMap: "Spot map",
  mapIntro: "Drawn on this phone from your spots' GPS. No map is loaded. North is up.",
  mapNoGps: "None of your spots has a GPS location yet. Add one when you save a spot.",
  mapCurrentNoGps: "The current spot has no GPS location.",
  mapLabel: (count) => (count === 1 ? "Map of 1 spot" : `Map of ${count} spots`),
  showMyPosition: "Show where I am",
  locatingYou: "Finding your location…",
  noSignal: "No GPS signal yet. Still looking; it works better outside.",
  positionError: "Could not get your location. Check that this site may use it.",
  toYourBike: "To your bike",
  you: "You",
  youOffMap: "You, off the edge of the map",
  atYourBike: "You are at your bike",
  towards: (distance, direction) => `${distance} ${COMPASS_EN[direction]}`,
  fromCurrent: (label, distance, direction) =>
    `${label}: ${distance} ${COMPASS_EN[direction]} of the current spot`,
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
  factDistance: (distance) => `${en.opts[distance]} distance`,
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
  spotMap: "Plekkenkaart",
  mapIntro:
    "Op deze telefoon getekend uit de GPS van je plekken. Er wordt geen kaart geladen. Het noorden is boven.",
  mapNoGps:
    "Geen van je plekken heeft al een GPS-locatie. Voeg er een toe als je een plek opslaat.",
  mapCurrentNoGps: "De huidige plek heeft geen GPS-locatie.",
  mapLabel: (count) => (count === 1 ? "Kaart van één plek" : `Kaart van ${count} plekken`),
  showMyPosition: "Laat zien waar ik ben",
  locatingYou: "Je locatie zoeken…",
  noSignal: "Nog geen GPS-signaal. We blijven zoeken; buiten lukt het beter.",
  positionError: "Je locatie is niet gevonden. Controleer of deze site hem mag gebruiken.",
  toYourBike: "Naar je fiets",
  you: "Jij",
  youOffMap: "Jij, buiten de rand van de kaart",
  atYourBike: "Je bent bij je fiets",
  towards: (distance, direction) => `${distance} naar het ${COMPASS_NL[direction]}`,
  fromCurrent: (label, distance, direction) =>
    `${label}: ${distance} ten ${COMPASS_NL[direction]} van de huidige plek`,
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
  factDistance: (distance) => `Afstand ${nl.opts[distance].toLowerCase()}`,
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
};

// Adverbs for "120 m nordöstlich" and "nordöstlich des aktuellen Platzes".
const COMPASS_DE: Record<Compass, string> = {
  n: "nördlich",
  ne: "nordöstlich",
  e: "östlich",
  se: "südöstlich",
  s: "südlich",
  sw: "südwestlich",
  w: "westlich",
  nw: "nordwestlich",
};

const DE_DISTANCE: Record<Distance, string> = {
  close: "Nah am Eingang",
  middle: "In der Mitte",
  far: "Weit hinten",
};

const de: Dict = {
  currentSpot: "Aktueller Platz",
  hasGps: "Mit GPS-Standort",
  viewDetails: "Details ansehen",
  changeLocation: "Platz ändern",
  updated: (time) => `Aktualisiert ${time}`,
  saved: (time) => `Gespeichert ${time}`,
  currentBikeRef: "Foto vom aktuellen Platz",
  navigation: "Mehr",
  noSpotYet: "Kein Fahrrad abgestellt",
  emptyIntro:
    "Speichere, wo du dein Fahrrad abstellst, und finde es später wieder. Alles bleibt auf diesem Handy.",
  saveSpot: "Platz speichern",
  justNow: "gerade eben",
  bikeCollected: "Fahrrad abgeholt",
  removeFromRecent: "Aus Verlauf entfernen",
  noRecentYet: "Frühere Plätze erscheinen hier, sobald du einen neuen speicherst.",
  recentLocations: "Verlauf",
  settings: "Einstellungen",

  cancel: "Abbrechen",
  back: "Zurück",
  whereParked: "Abgestellt",
  whereOpts: { station: "Im Parkhaus", outside: "Draußen" },
  saveLocation: "Speichern",
  errorLaneRequired: "Gib die Reihe ein, damit du das Fahrrad wiederfindest.",
  errorNothingToFindBy:
    "Füge eine Notiz, ein Foto oder einen GPS-Standort hinzu, damit du das Fahrrad wiederfindest.",
  moreDetails: "Weitere Details",
  gpsLocation: "GPS-Standort",
  notes: "Notizen",
  photo: "Foto",
  floor: "Etage",
  lane: "Reihe",
  distance: "Entfernung",
  distanceHelpText: "Nah = beim Eingang. Mitte = etwa in der Mitte. Weit = weiter hinten.",
  side: "Seite",
  rackLevel: "Ebene",
  rackNumber: "Stellplatznummer",
  opts: {
    close: "Nah",
    middle: "Mitte",
    far: "Weit",
    left: "Links",
    right: "Rechts",
    top: "Oben",
    bottom: "Unten",
  },

  locating: "Suche Standort…",
  updateLocation: "Standort aktualisieren",
  useMyLocation: "Meinen Standort nutzen",
  captured: "Erfasst",
  accuracy: (value) => `Genauigkeit ${value}`,
  geoError:
    "Dein Standort konnte nicht ermittelt werden. Prüfe die Berechtigungen und versuche es erneut.",

  photoPreviewAlt: "Fotovorschau",
  replacePhoto: "Foto ersetzen",
  addPhoto: "Foto hinzufügen",
  removePhoto: "Foto entfernen",
  photoMetadataKept:
    "Dieser Browser konnte die Standortdaten nicht aus dem Foto entfernen. Das Foto bleibt auf diesem Gerät.",

  close: "Schließen",

  locationDetails: "Platzdetails",
  savedBikeRef: "Foto vom gespeicherten Platz",
  recentBikeRef: "Foto von einem früheren Platz",
  recentPreview: "Vorschau früherer Platz",
  openInMaps: "In Maps öffnen",
  spotMap: "Karte",
  mapIntro:
    "Auf diesem Handy aus dem GPS deiner Plätze gezeichnet. Es wird keine Karte geladen. Norden ist oben.",
  mapNoGps:
    "Noch keiner deiner Plätze hat einen GPS-Standort. Füge einen hinzu, wenn du einen Platz speicherst.",
  mapCurrentNoGps: "Der aktuelle Platz hat keinen GPS-Standort.",
  mapLabel: (count) => (count === 1 ? "Karte mit einem Platz" : `Karte mit ${count} Plätzen`),
  showMyPosition: "Zeig, wo ich bin",
  locatingYou: "Suche deinen Standort…",
  noSignal: "Noch kein GPS-Signal. Die Suche läuft weiter; draußen klappt es besser.",
  positionError: "Dein Standort ist nicht verfügbar. Prüfe, ob diese Seite ihn nutzen darf.",
  toYourBike: "Zu deinem Fahrrad",
  you: "Du",
  youOffMap: "Du, außerhalb der Karte",
  atYourBike: "Du bist bei deinem Fahrrad",
  towards: (distance, direction) => `${distance} ${COMPASS_DE[direction]}`,
  fromCurrent: (label, distance, direction) =>
    `${label}: ${distance} ${COMPASS_DE[direction]} des aktuellen Platzes`,
  stationFloor: "Etage",
  useThisLocation: "Diesen Platz wiederherstellen",
  viewRecent: (title) => `${title} ansehen`,

  station: "Fahrradparkhaus",
  stationName: "Name des Parkhauses",
  stationNamePlaceholder: "z. B. Münster Hbf",
  general: "Allgemein",
  enabledFields: "Welche Angaben hat dein Parkhaus?",
  floorInput: "Eingabe Etage",
  laneInput: "Eingabe Reihe",
  theme: "Design",
  themeOpts: { system: "System", light: "Hell", dark: "Dunkel" },
  numberInput: "Freie Eingabe",
  quickMode: { lane: "Feste Reihen", floor: "Feste Etagen" },
  presetLabel: (noun, n) => `${noun} ${n}`,
  removePreset: (noun, n) => `${noun} ${n} entfernen`,
  addPreset: (noun) => `${noun} hinzufügen`,

  outsideStation: "Außerhalb des Parkhauses",
  bikeSpot: "Fahrradplatz",
  rackN: (n) => `Stellplatz ${n}`,
  laneN: (n) => `Reihe ${n}`,
  stationFloorN: (n) => `Etage ${n}`,
  factDistance: (distance) => DE_DISTANCE[distance],
  factSide: (side) => (side === "left" ? "Linke Seite" : "Rechte Seite"),
  factRack: (level) => (level === "top" ? "Obere Ebene" : "Untere Ebene"),
  notSaved: "noch nicht gespeichert",

  noticeSaveFailed: "Speichern fehlgeschlagen – Speicher voll oder blockiert",
  noticeDataUnreadable:
    "Deine gespeicherten Plätze und Einstellungen konnten nicht gelesen werden – eine Kopie liegt auf diesem Gerät; exportiere sie in den Einstellungen",
  noticeSomeDataUnreadable:
    "Einige gespeicherte Plätze konnten nicht gelesen werden – eine Kopie liegt auf diesem Gerät; exportiere sie in den Einstellungen",
  noticeLocationUpdated: "Platz gespeichert",
  noticeLocationReplaced: "Platz gespeichert – der vorige ist im Verlauf",
  noticeCollected: "Platz geleert – im Verlauf behalten",
  noticeRecentRemoved: "Aus Verlauf entfernt",
  noticeRecentRestored: "Wieder im Verlauf",
  undo: "Rückgängig",
  noticeLocationFromRecent: "Früherer Platz wiederhergestellt",
  noticeDataCleared: "Alle Daten gelöscht",
  clearAllData: "Alle Daten löschen",
  exportSpots: "Plätze exportieren",
  importSpots: "Plätze importieren",
  exportUnreadable: "Unlesbare Daten exportieren",
  clearUnreadable: "Unlesbare Daten löschen",
  clearUnreadableConfirm:
    "Die Kopie der unlesbaren Daten von diesem Gerät löschen, samt der Fotos, auf die nur sie verweist? Exportiere sie vorher, wenn du sie behalten willst.",
  noticeImported: (count) => (count === 1 ? "1 Platz importiert" : `${count} Plätze importiert`),
  noticeImportInvalid: "Keine Bikespot-Exportdatei – nichts importiert",
  clearAllDataConfirm:
    "Alle gespeicherten Plätze, Fotos und Einstellungen von diesem Gerät löschen?",
  viewSourceVersion: (version) => `Quellcode ansehen, Version ${version}`,

  language: "Sprache",
};

// With their preposition, for "120 m au nord-est" and "à 40 m à l'est de".
const COMPASS_FR: Record<Compass, string> = {
  n: "au nord",
  ne: "au nord-est",
  e: "à l’est",
  se: "au sud-est",
  s: "au sud",
  sw: "au sud-ouest",
  w: "à l’ouest",
  nw: "au nord-ouest",
};

const FR_DISTANCE: Record<Distance, string> = {
  close: "Près de l’entrée",
  middle: "Au milieu",
  far: "Au fond",
};

// French needs the article and gender of the noun: "Ajouter une allée".
const FR_ARTICLE: Record<string, string> = { Allée: "une allée", Étage: "un étage" };

const fr: Dict = {
  currentSpot: "Place actuelle",
  hasGps: "Avec position GPS",
  viewDetails: "Voir les détails",
  changeLocation: "Changer de place",
  updated: (time) => `Mis à jour ${time}`,
  saved: (time) => `Enregistré ${time}`,
  currentBikeRef: "Photo de la place actuelle",
  navigation: "Plus",
  noSpotYet: "Aucun vélo garé",
  emptyIntro:
    "Enregistre l’endroit où tu laisses ton vélo, et retrouve-le plus tard. Tout reste sur ce téléphone.",
  saveSpot: "Enregistrer la place",
  justNow: "à l’instant",
  bikeCollected: "Vélo récupéré",
  removeFromRecent: "Retirer de l’historique",
  noRecentYet: "Tes places précédentes s’affichent ici dès que tu en enregistres une nouvelle.",
  recentLocations: "Historique",
  settings: "Réglages",

  cancel: "Annuler",
  back: "Retour",
  whereParked: "Garé",
  whereOpts: { station: "Au parking", outside: "Dehors" },
  saveLocation: "Enregistrer",
  errorLaneRequired: "Indique l’allée pour retrouver ton vélo.",
  errorNothingToFindBy: "Ajoute une note, une photo ou une position GPS pour retrouver ton vélo.",
  moreDetails: "Plus de détails",
  gpsLocation: "Position GPS",
  notes: "Notes",
  photo: "Photo",
  floor: "Étage",
  lane: "Allée",
  distance: "Distance",
  distanceHelpText: "Proche = vers l’entrée. Milieu = vers le milieu. Loin = plus au fond.",
  side: "Côté",
  rackLevel: "Niveau",
  rackNumber: "N° d’emplacement",
  opts: {
    close: "Proche",
    middle: "Milieu",
    far: "Loin",
    left: "Gauche",
    right: "Droite",
    top: "Haut",
    bottom: "Bas",
  },

  locating: "Localisation…",
  updateLocation: "Mettre à jour la position",
  useMyLocation: "Utiliser ma position",
  captured: "Enregistrée",
  accuracy: (value) => `précision ${value}`,
  geoError: "Impossible d’obtenir ta position. Vérifie les autorisations et réessaie.",

  photoPreviewAlt: "Aperçu de la photo",
  replacePhoto: "Remplacer la photo",
  addPhoto: "Ajouter une photo",
  removePhoto: "Supprimer la photo",
  photoMetadataKept:
    "Ce navigateur n’a pas pu retirer les données de position de la photo. La photo reste sur cet appareil.",

  close: "Fermer",

  locationDetails: "Détails de la place",
  savedBikeRef: "Photo de la place enregistrée",
  recentBikeRef: "Photo d’une place précédente",
  recentPreview: "Aperçu d’une place précédente",
  openInMaps: "Ouvrir dans Maps",
  spotMap: "Carte des places",
  mapIntro:
    "Dessinée sur ce téléphone à partir du GPS de tes places. Aucune carte n’est chargée. Le nord est en haut.",
  mapNoGps:
    "Aucune de tes places n’a encore de position GPS. Ajoute-en une quand tu enregistres une place.",
  mapCurrentNoGps: "La place actuelle n’a pas de position GPS.",
  mapLabel: (count) => (count === 1 ? "Carte d’une place" : `Carte de ${count} places`),
  showMyPosition: "Montrer où je suis",
  locatingYou: "Recherche de ta position…",
  noSignal: "Pas encore de signal GPS. La recherche continue ; ça marche mieux dehors.",
  positionError: "Impossible d’obtenir ta position. Vérifie que ce site peut l’utiliser.",
  toYourBike: "Vers ton vélo",
  you: "Toi",
  youOffMap: "Toi, hors de la carte",
  atYourBike: "Tu es près de ton vélo",
  towards: (distance, direction) => `${distance} ${COMPASS_FR[direction]}`,
  fromCurrent: (label, distance, direction) =>
    `${label} : ${distance} ${COMPASS_FR[direction]} de la place actuelle`,
  stationFloor: "Étage",
  useThisLocation: "Reprendre cette place",
  viewRecent: (title) => `Voir ${title}`,

  station: "Parking vélos",
  stationName: "Nom du parking",
  stationNamePlaceholder: "ex. Strasbourg Gare",
  general: "Général",
  enabledFields: "Quels repères a ton parking ?",
  floorInput: "Saisie de l’étage",
  laneInput: "Saisie de l’allée",
  theme: "Thème",
  themeOpts: { system: "Système", light: "Clair", dark: "Sombre" },
  numberInput: "Saisie libre",
  quickMode: { lane: "Allées fixes", floor: "Étages fixes" },
  presetLabel: (noun, n) => `${noun} ${n}`,
  removePreset: (noun, n) => `Supprimer ${noun.toLowerCase()} ${n}`,
  addPreset: (noun) => `Ajouter ${FR_ARTICLE[noun] ?? noun.toLowerCase()}`,

  outsideStation: "Hors du parking",
  bikeSpot: "Place vélo",
  rackN: (n) => `Emplacement ${n}`,
  laneN: (n) => `Allée ${n}`,
  stationFloorN: (n) => `Étage ${n}`,
  factDistance: (distance) => FR_DISTANCE[distance],
  factSide: (side) => (side === "left" ? "Côté gauche" : "Côté droit"),
  factRack: (level) => (level === "top" ? "Niveau haut" : "Niveau bas"),
  notSaved: "pas encore enregistrée",

  noticeSaveFailed: "Enregistrement impossible – stockage plein ou bloqué",
  noticeDataUnreadable:
    "Impossible de lire tes places et réglages – une copie est gardée sur cet appareil ; exporte-la depuis les Réglages",
  noticeSomeDataUnreadable:
    "Certaines places n’ont pas pu être lues – une copie est gardée sur cet appareil ; exporte-la depuis les Réglages",
  noticeLocationUpdated: "Place enregistrée",
  noticeLocationReplaced: "Place enregistrée – la précédente est dans l’historique",
  noticeCollected: "Place libérée – gardée dans l’historique",
  noticeRecentRemoved: "Retirée de l’historique",
  noticeRecentRestored: "De retour dans l’historique",
  undo: "Annuler",
  noticeLocationFromRecent: "Place précédente reprise",
  noticeDataCleared: "Toutes les données effacées",
  clearAllData: "Effacer toutes les données",
  exportSpots: "Exporter les places",
  importSpots: "Importer des places",
  exportUnreadable: "Exporter les données illisibles",
  clearUnreadable: "Effacer les données illisibles",
  clearUnreadableConfirm:
    "Effacer de cet appareil la copie des données illisibles, avec les photos auxquelles elle seule renvoie ? Exporte-la d’abord pour la garder.",
  noticeImported: (count) => (count === 1 ? "1 place importée" : `${count} places importées`),
  noticeImportInvalid: "Ce n’est pas un fichier d’export Bikespot – rien n’a été importé",
  clearAllDataConfirm:
    "Effacer de cet appareil toutes les places, photos et réglages enregistrés ?",
  viewSourceVersion: (version) => `Voir le code source, version ${version}`,

  language: "Langue",
};

// For "120 m mod nordøst" and "40 m sydvest for".
const COMPASS_DA: Record<Compass, string> = {
  n: "nord",
  ne: "nordøst",
  e: "øst",
  se: "sydøst",
  s: "syd",
  sw: "sydvest",
  w: "vest",
  nw: "nordvest",
};

const DA_DISTANCE: Record<Distance, string> = {
  close: "Tæt på indgangen",
  middle: "I midten",
  far: "Langt inde",
};

const da: Dict = {
  currentSpot: "Nuværende plads",
  hasGps: "Har GPS-position",
  viewDetails: "Se detaljer",
  changeLocation: "Skift plads",
  updated: (time) => `Opdateret ${time}`,
  saved: (time) => `Gemt ${time}`,
  currentBikeRef: "Foto af den nuværende plads",
  navigation: "Mere",
  noSpotYet: "Ingen cykel parkeret",
  emptyIntro:
    "Gem, hvor du stiller din cykel, og find den igen senere. Alt bliver på denne telefon.",
  saveSpot: "Gem plads",
  justNow: "netop nu",
  bikeCollected: "Cykel hentet",
  removeFromRecent: "Fjern fra Seneste",
  noRecentYet: "Tidligere pladser vises her, når du gemmer en ny.",
  recentLocations: "Seneste pladser",
  settings: "Indstillinger",

  cancel: "Annuller",
  back: "Tilbage",
  whereParked: "Parkeret",
  whereOpts: { station: "I parkeringen", outside: "Udenfor" },
  saveLocation: "Gem",
  errorLaneRequired: "Angiv rækken, så du kan finde cyklen igen.",
  errorNothingToFindBy:
    "Tilføj en note, et foto eller en GPS-position, så du kan finde cyklen igen.",
  moreDetails: "Flere detaljer",
  gpsLocation: "GPS-position",
  notes: "Noter",
  photo: "Foto",
  floor: "Etage",
  lane: "Række",
  distance: "Afstand",
  distanceHelpText: "Tæt = ved indgangen. Midt = omkring midten. Langt = længere inde.",
  side: "Side",
  rackLevel: "Niveau",
  rackNumber: "Stativnummer",
  opts: {
    close: "Tæt",
    middle: "Midt",
    far: "Langt",
    left: "Venstre",
    right: "Højre",
    top: "Øverst",
    bottom: "Nederst",
  },

  locating: "Finder position…",
  updateLocation: "Opdater position",
  useMyLocation: "Brug min position",
  captured: "Registreret",
  accuracy: (value) => `${value} nøjagtighed`,
  geoError: "Kunne ikke finde din position. Tjek tilladelserne, og prøv igen.",

  photoPreviewAlt: "Forhåndsvisning af foto",
  replacePhoto: "Erstat foto",
  addPhoto: "Tilføj foto",
  removePhoto: "Fjern foto",
  photoMetadataKept:
    "Denne browser kunne ikke fjerne positionsdata fra fotoet. Fotoet bliver på denne enhed.",

  close: "Luk",

  locationDetails: "Pladsdetaljer",
  savedBikeRef: "Foto af den gemte plads",
  recentBikeRef: "Foto af en tidligere plads",
  recentPreview: "Forhåndsvisning af tidligere plads",
  openInMaps: "Åbn i Maps",
  spotMap: "Pladskort",
  mapIntro:
    "Tegnet på denne telefon ud fra dine pladsers GPS. Der hentes intet kort. Nord er opad.",
  mapNoGps: "Ingen af dine pladser har en GPS-position endnu. Tilføj en, når du gemmer en plads.",
  mapCurrentNoGps: "Den nuværende plads har ingen GPS-position.",
  mapLabel: (count) => (count === 1 ? "Kort over én plads" : `Kort over ${count} pladser`),
  showMyPosition: "Vis, hvor jeg er",
  locatingYou: "Finder din position…",
  noSignal: "Intet GPS-signal endnu. Der søges stadig; det virker bedre udenfor.",
  positionError: "Kunne ikke finde din position. Tjek, at denne side må bruge den.",
  toYourBike: "Til din cykel",
  you: "Dig",
  youOffMap: "Dig, uden for kortet",
  atYourBike: "Du er ved din cykel",
  towards: (distance, direction) => `${distance} mod ${COMPASS_DA[direction]}`,
  fromCurrent: (label, distance, direction) =>
    `${label}: ${distance} ${COMPASS_DA[direction]} for den nuværende plads`,
  stationFloor: "Etage",
  useThisLocation: "Gendan denne plads",
  viewRecent: (title) => `Se ${title}`,

  station: "Cykelparkering",
  stationName: "Parkeringens navn",
  stationNamePlaceholder: "f.eks. Københavns Hovedbanegård",
  general: "Generelt",
  enabledFields: "Hvilke oplysninger har din cykelparkering?",
  floorInput: "Indtastning af etage",
  laneInput: "Indtastning af række",
  theme: "Tema",
  themeOpts: { system: "System", light: "Lyst", dark: "Mørkt" },
  numberInput: "Indtast selv",
  quickMode: { lane: "Faste rækker", floor: "Faste etager" },
  presetLabel: (noun, n) => `${noun} ${n}`,
  removePreset: (noun, n) => `Fjern ${noun.toLowerCase()} ${n}`,
  addPreset: (noun) => `Tilføj ${noun.toLowerCase()}`,

  outsideStation: "Uden for parkeringen",
  bikeSpot: "Cykelplads",
  rackN: (n) => `Stativ ${n}`,
  laneN: (n) => `Række ${n}`,
  stationFloorN: (n) => `Etage ${n}`,
  factDistance: (distance) => DA_DISTANCE[distance],
  factSide: (side) => (side === "left" ? "Venstre side" : "Højre side"),
  factRack: (level) => (level === "top" ? "Øverste stativ" : "Nederste stativ"),
  notSaved: "ikke gemt endnu",

  noticeSaveFailed: "Kunne ikke gemme – lageret er fuldt eller blokeret",
  noticeDataUnreadable:
    "Dine gemte pladser og indstillinger kunne ikke læses – en kopi ligger på denne enhed; eksporter den fra Indstillinger",
  noticeSomeDataUnreadable:
    "Nogle gemte pladser kunne ikke læses – en kopi ligger på denne enhed; eksporter den fra Indstillinger",
  noticeLocationUpdated: "Plads gemt",
  noticeLocationReplaced: "Plads gemt – den forrige ligger i Seneste",
  noticeCollected: "Plads ryddet – gemt i Seneste",
  noticeRecentRemoved: "Fjernet fra Seneste",
  noticeRecentRestored: "Tilbage i Seneste",
  undo: "Fortryd",
  noticeLocationFromRecent: "Tidligere plads gendannet",
  noticeDataCleared: "Alle data slettet",
  clearAllData: "Slet alle data",
  exportSpots: "Eksporter pladser",
  importSpots: "Importer pladser",
  exportUnreadable: "Eksporter ulæselige data",
  clearUnreadable: "Slet ulæselige data",
  clearUnreadableConfirm:
    "Slet kopien af de ulæselige data fra denne enhed, sammen med de fotos kun den henviser til? Eksporter den først, hvis du vil beholde den.",
  noticeImported: (count) => (count === 1 ? "1 plads importeret" : `${count} pladser importeret`),
  noticeImportInvalid: "Ikke en Bikespot-eksportfil – intet importeret",
  clearAllDataConfirm: "Slet alle gemte pladser, fotos og indstillinger fra denne enhed?",
  viewSourceVersion: (version) => `Se kildekoden, version ${version}`,

  language: "Sprog",
};

// For "120 m åt nordost" and "40 m sydväst om".
const COMPASS_SV: Record<Compass, string> = {
  n: "norr",
  ne: "nordost",
  e: "öster",
  se: "sydost",
  s: "söder",
  sw: "sydväst",
  w: "väster",
  nw: "nordväst",
};

const SV_DISTANCE: Record<Distance, string> = {
  close: "Nära ingången",
  middle: "I mitten",
  far: "Långt in",
};

const sv: Dict = {
  currentSpot: "Nuvarande plats",
  hasGps: "Har GPS-position",
  viewDetails: "Visa detaljer",
  changeLocation: "Ändra plats",
  updated: (time) => `Uppdaterad ${time}`,
  saved: (time) => `Sparad ${time}`,
  currentBikeRef: "Foto av nuvarande plats",
  navigation: "Mer",
  noSpotYet: "Ingen cykel parkerad",
  emptyIntro:
    "Spara var du ställer cykeln och hitta den igen senare. Allt stannar på den här telefonen.",
  saveSpot: "Spara plats",
  justNow: "precis nu",
  bikeCollected: "Cykeln hämtad",
  removeFromRecent: "Ta bort från Senaste",
  noRecentYet: "Tidigare platser visas här när du sparar en ny.",
  recentLocations: "Senaste platser",
  settings: "Inställningar",

  cancel: "Avbryt",
  back: "Tillbaka",
  whereParked: "Parkerad",
  whereOpts: { station: "I garaget", outside: "Utomhus" },
  saveLocation: "Spara",
  errorLaneRequired: "Ange raden så att du hittar cykeln igen.",
  errorNothingToFindBy:
    "Lägg till en anteckning, ett foto eller en GPS-position så att du hittar cykeln igen.",
  moreDetails: "Fler detaljer",
  gpsLocation: "GPS-position",
  notes: "Anteckningar",
  photo: "Foto",
  floor: "Våning",
  lane: "Rad",
  distance: "Avstånd",
  distanceHelpText: "Nära = vid ingången. Mitten = runt mitten. Långt = längre in.",
  side: "Sida",
  rackLevel: "Nivå",
  rackNumber: "Ställnummer",
  opts: {
    close: "Nära",
    middle: "Mitten",
    far: "Långt",
    left: "Vänster",
    right: "Höger",
    top: "Övre",
    bottom: "Undre",
  },

  locating: "Söker position…",
  updateLocation: "Uppdatera position",
  useMyLocation: "Använd min position",
  captured: "Hämtad",
  accuracy: (value) => `${value} noggrannhet`,
  geoError: "Kunde inte hämta din position. Kontrollera behörigheterna och försök igen.",

  photoPreviewAlt: "Förhandsvisning av foto",
  replacePhoto: "Byt foto",
  addPhoto: "Lägg till foto",
  removePhoto: "Ta bort foto",
  photoMetadataKept:
    "Webbläsaren kunde inte ta bort platsdata från fotot. Fotot stannar på den här enheten.",

  close: "Stäng",

  locationDetails: "Platsdetaljer",
  savedBikeRef: "Foto av sparad plats",
  recentBikeRef: "Foto av tidigare plats",
  recentPreview: "Förhandsvisning av tidigare plats",
  openInMaps: "Öppna i Maps",
  spotMap: "Platskarta",
  mapIntro:
    "Ritad på den här telefonen utifrån dina platsers GPS. Ingen karta laddas. Norr är uppåt.",
  mapNoGps: "Ingen av dina platser har någon GPS-position än. Lägg till en när du sparar en plats.",
  mapCurrentNoGps: "Den nuvarande platsen har ingen GPS-position.",
  mapLabel: (count) => (count === 1 ? "Karta över en plats" : `Karta över ${count} platser`),
  showMyPosition: "Visa var jag är",
  locatingYou: "Söker din position…",
  noSignal: "Ingen GPS-signal än. Sökningen fortsätter; det går bättre utomhus.",
  positionError: "Kunde inte hämta din position. Kontrollera att sidan får använda den.",
  toYourBike: "Till din cykel",
  you: "Du",
  youOffMap: "Du, utanför kartan",
  atYourBike: "Du är vid din cykel",
  towards: (distance, direction) => `${distance} åt ${COMPASS_SV[direction]}`,
  fromCurrent: (label, distance, direction) =>
    `${label}: ${distance} ${COMPASS_SV[direction]} om nuvarande plats`,
  stationFloor: "Våning",
  useThisLocation: "Återställ den här platsen",
  viewRecent: (title) => `Visa ${title}`,

  station: "Cykelgarage",
  stationName: "Garagets namn",
  stationNamePlaceholder: "t.ex. Malmö C",
  general: "Allmänt",
  enabledFields: "Vilka uppgifter har ditt cykelgarage?",
  floorInput: "Inmatning av våning",
  laneInput: "Inmatning av rad",
  theme: "Tema",
  themeOpts: { system: "System", light: "Ljust", dark: "Mörkt" },
  numberInput: "Fri inmatning",
  quickMode: { lane: "Fasta rader", floor: "Fasta våningar" },
  presetLabel: (noun, n) => `${noun} ${n}`,
  removePreset: (noun, n) => `Ta bort ${noun.toLowerCase()} ${n}`,
  addPreset: (noun) => `Lägg till ${noun.toLowerCase()}`,

  outsideStation: "Utanför garaget",
  bikeSpot: "Cykelplats",
  rackN: (n) => `Ställ ${n}`,
  laneN: (n) => `Rad ${n}`,
  stationFloorN: (n) => `Våning ${n}`,
  factDistance: (distance) => SV_DISTANCE[distance],
  factSide: (side) => (side === "left" ? "Vänster sida" : "Höger sida"),
  factRack: (level) => (level === "top" ? "Övre stället" : "Undre stället"),
  notSaved: "inte sparad än",

  noticeSaveFailed: "Kunde inte spara – lagringen är full eller blockerad",
  noticeDataUnreadable:
    "Dina sparade platser och inställningar kunde inte läsas – en kopia finns på den här enheten; exportera den från Inställningar",
  noticeSomeDataUnreadable:
    "Vissa sparade platser kunde inte läsas – en kopia finns på den här enheten; exportera den från Inställningar",
  noticeLocationUpdated: "Plats sparad",
  noticeLocationReplaced: "Plats sparad – den förra finns i Senaste",
  noticeCollected: "Plats rensad – sparad i Senaste",
  noticeRecentRemoved: "Borttagen från Senaste",
  noticeRecentRestored: "Tillbaka i Senaste",
  undo: "Ångra",
  noticeLocationFromRecent: "Tidigare plats återställd",
  noticeDataCleared: "All data rensad",
  clearAllData: "Rensa all data",
  exportSpots: "Exportera platser",
  importSpots: "Importera platser",
  exportUnreadable: "Exportera oläslig data",
  clearUnreadable: "Rensa oläslig data",
  clearUnreadableConfirm:
    "Rensa kopian av den oläsliga datan från den här enheten, med de foton bara den hänvisar till? Exportera den först om du vill behålla den.",
  noticeImported: (count) => (count === 1 ? "1 plats importerad" : `${count} platser importerade`),
  noticeImportInvalid: "Inte en Bikespot-exportfil – inget importerat",
  clearAllDataConfirm: "Rensa alla sparade platser, foton och inställningar från den här enheten?",
  viewSourceVersion: (version) => `Visa källkoden, version ${version}`,

  language: "Språk",
};

const COMPASS_JA: Record<Compass, string> = {
  n: "北",
  ne: "北東",
  e: "東",
  se: "南東",
  s: "南",
  sw: "南西",
  w: "西",
  nw: "北西",
};

const JA_DISTANCE: Record<Distance, string> = {
  close: "入口の近く",
  middle: "中ほど",
  far: "奥のほう",
};

const ja: Dict = {
  currentSpot: "現在の場所",
  hasGps: "GPS位置あり",
  viewDetails: "詳細を見る",
  changeLocation: "場所を変更",
  updated: (time) => `更新：${time}`,
  saved: (time) => `保存：${time}`,
  currentBikeRef: "現在の場所の写真",
  navigation: "その他",
  noSpotYet: "駐輪中の自転車なし",
  emptyIntro:
    "自転車を停めた場所を保存して、あとで見つけられます。データはすべてこの端末に残ります。",
  saveSpot: "場所を保存",
  justNow: "たった今",
  bikeCollected: "自転車を回収",
  removeFromRecent: "履歴から削除",
  noRecentYet: "新しい場所を保存すると、以前の場所がここに表示されます。",
  recentLocations: "履歴",
  settings: "設定",

  cancel: "キャンセル",
  back: "戻る",
  whereParked: "駐輪場所",
  whereOpts: { station: "駐輪場内", outside: "駐輪場外" },
  saveLocation: "保存",
  errorLaneRequired: "自転車を見つけられるよう、列を入力してください。",
  errorNothingToFindBy:
    "自転車を見つけられるよう、メモ・写真・GPS位置のいずれかを追加してください。",
  moreDetails: "詳細",
  gpsLocation: "GPS位置",
  notes: "メモ",
  photo: "写真",
  floor: "階",
  lane: "列",
  distance: "奥行き",
  distanceHelpText: "手前＝入口の近く。中ほど＝真ん中あたり。奥＝奥のほう。",
  side: "左右",
  rackLevel: "段",
  rackNumber: "ラック番号",
  opts: {
    close: "手前",
    middle: "中ほど",
    far: "奥",
    left: "左",
    right: "右",
    top: "上段",
    bottom: "下段",
  },

  locating: "位置を取得中…",
  updateLocation: "位置を更新",
  useMyLocation: "現在地を使う",
  captured: "取得済み",
  accuracy: (value) => `精度 ${value}`,
  geoError: "位置を取得できませんでした。権限を確認して、もう一度お試しください。",

  photoPreviewAlt: "写真のプレビュー",
  replacePhoto: "写真を変更",
  addPhoto: "写真を追加",
  removePhoto: "写真を削除",
  photoMetadataKept:
    "このブラウザでは写真の位置情報を削除できませんでした。写真はこの端末から出ません。",

  close: "閉じる",

  locationDetails: "場所の詳細",
  savedBikeRef: "保存した場所の写真",
  recentBikeRef: "以前の場所の写真",
  recentPreview: "以前の場所のプレビュー",
  openInMaps: "マップで開く",
  spotMap: "場所マップ",
  mapIntro: "保存した場所のGPSからこの端末上で描画しています。地図は読み込みません。上が北です。",
  mapNoGps: "GPS位置のある場所はまだありません。場所を保存するときに追加できます。",
  mapCurrentNoGps: "現在の場所にはGPS位置がありません。",
  mapLabel: (count) => `${count}か所の地図`,
  showMyPosition: "現在地を表示",
  locatingYou: "現在地を検索中…",
  noSignal: "GPS信号をまだ受信していません。検索を続けています。屋外のほうが受信しやすくなります。",
  positionError:
    "現在地を取得できませんでした。このサイトに位置情報の使用を許可しているか確認してください。",
  toYourBike: "自転車まで",
  you: "現在地",
  youOffMap: "現在地（地図の外）",
  atYourBike: "自転車の場所に着きました",
  towards: (distance, direction) => `${COMPASS_JA[direction]}へ${distance}`,
  fromCurrent: (label, distance, direction) =>
    `${label}：現在の場所から${COMPASS_JA[direction]}へ${distance}`,
  stationFloor: "階",
  useThisLocation: "この場所に戻す",
  viewRecent: (title) => `${title}を見る`,

  station: "駐輪場",
  stationName: "駐輪場の名前",
  stationNamePlaceholder: "例：京都駅",
  general: "一般",
  enabledFields: "駐輪場にある表示は？",
  floorInput: "階の入力",
  laneInput: "列の入力",
  theme: "テーマ",
  themeOpts: { system: "システム", light: "ライト", dark: "ダーク" },
  numberInput: "番号入力",
  quickMode: { lane: "列を選択", floor: "階を選択" },
  presetLabel: (noun, n) => `${n}番目の${noun}`,
  removePreset: (noun, n) => `${n}番目の${noun}を削除`,
  addPreset: (noun) => `${noun}を追加`,

  outsideStation: "駐輪場の外",
  bikeSpot: "駐輪場所",
  rackN: (n) => `${n}番`,
  laneN: (n) => `${n}列`,
  stationFloorN: (n) => `${n}階`,
  factDistance: (distance) => JA_DISTANCE[distance],
  factSide: (side) => (side === "left" ? "左側" : "右側"),
  factRack: (level) => (level === "top" ? "上段" : "下段"),
  notSaved: "未保存",

  noticeSaveFailed: "保存できません。ストレージがいっぱいか、ブロックされています",
  noticeDataUnreadable:
    "保存した場所と設定を読み込めませんでした。コピーはこの端末にあります。設定からエクスポートしてください",
  noticeSomeDataUnreadable:
    "一部の場所を読み込めませんでした。コピーはこの端末にあります。設定からエクスポートしてください",
  noticeLocationUpdated: "場所を保存しました",
  noticeLocationReplaced: "場所を保存しました。以前の場所は履歴にあります",
  noticeCollected: "場所をクリアしました。履歴に残っています",
  noticeRecentRemoved: "履歴から削除しました",
  noticeRecentRestored: "履歴に戻しました",
  undo: "元に戻す",
  noticeLocationFromRecent: "以前の場所に戻しました",
  noticeDataCleared: "すべてのデータを消去しました",
  clearAllData: "すべてのデータを消去",
  exportSpots: "場所をエクスポート",
  importSpots: "場所をインポート",
  exportUnreadable: "読めないデータをエクスポート",
  clearUnreadable: "読めないデータを消去",
  clearUnreadableConfirm:
    "読めないデータのコピーと、それだけが参照する写真をこの端末から消去しますか？残す場合は先にエクスポートしてください。",
  noticeImported: (count) => `${count}か所をインポートしました`,
  noticeImportInvalid: "Bikespotのエクスポートファイルではありません。何もインポートしていません",
  clearAllDataConfirm: "保存した場所・写真・設定をすべてこの端末から消去しますか？",
  viewSourceVersion: (version) => `ソースコードを見る（バージョン ${version}）`,

  language: "言語",
};

const dict: Record<Lang, Dict> = { en, nl, de, fr, da, sv, ja };

export const t = computed(() => dict[lang.value]);
