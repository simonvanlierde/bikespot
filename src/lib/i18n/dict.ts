import type { Distance, RackLevel, Side } from "../app-data";
import type { Compass } from "../geo";

// Segmented-control option values, kept as key unions so a missing translation
// in any language is a type error rather than a silent `undefined` at render.
export type OptKey = Distance | Side | RackLevel;
type ThemeKey = "system" | "light" | "dark";

// Every language is typed `Dict`, so a missing or misspelled key, including
// one inside an option group, is a compile error.
export type Dict = {
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
  setupStation: string;
  laneHelp: string;
  exportHelp: string;

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
  takePhoto: string;
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
  noticeClearFailed: string;
  clearAllData: string;
  exportSpots: string;
  importSpots: string;
  importHelp: string;
  exportUnreadable: string;
  clearUnreadable: string;
  clearUnreadableConfirm: string;
  noticeImported: (count: number) => string;
  noticeImportedSkipped: (imported: number, skipped: number) => string;
  sameAsLastTime: string;
  resetFields: string;
  opensInNewWindow: string;
  noticeImportInvalid: string;
  clearAllDataConfirm: string;
  viewSourceVersion: (version: string) => string;

  language: string;
};
