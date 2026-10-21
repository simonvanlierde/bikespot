export const SIDES = ["left", "right"] as const;
export const RACK_LEVELS = ["top", "bottom"] as const;
export const DISTANCES = ["close", "middle", "far"] as const;

export type Side = (typeof SIDES)[number];
export type RackLevel = (typeof RACK_LEVELS)[number];
export type Distance = (typeof DISTANCES)[number];
export type FieldInputMode = "quick" | "number";

export type Coords = {
  lat: number;
  lng: number;
  accuracy?: number;
};

export type EnabledFields = {
  lane: boolean;
  side: boolean;
  rackLevel: boolean;
  distance: boolean;
  floor: boolean;
  rackNumber: boolean;
};

export const VISIBLE_FIELD_KEYS = ["side", "rackLevel", "distance", "floor", "rackNumber"] as const;

export const ENABLED_FIELD_KEYS = [
  "lane",
  ...VISIBLE_FIELD_KEYS,
] as const satisfies readonly (keyof EnabledFields)[];

export type StationConfig = {
  name: string;
  laneInputMode: FieldInputMode;
  laneLabels: string[];
  floorInputMode: FieldInputMode;
  floorLabels: string[];
  enabledFields: EnabledFields;
};

export type VisibleFields = Partial<Record<(typeof VISIBLE_FIELD_KEYS)[number], true>>;

type RecordBase = {
  id: string;
  updatedAt: string;
  stationName: string;
  notes?: string;
  photoId?: string;
  coords?: Coords;
};

type StationLocationRecord = RecordBase & {
  mode: "station";
  lane?: string;
  visibleFields: VisibleFields;
  side?: Side;
  rackLevel?: RackLevel;
  distance?: Distance;
  floor?: string;
  rackNumber?: string;
};

// An outside spot's free text lives in `notes`. Records saved before that
// called it `outsideDescription`; repository.ts reads both.
type OutsideLocationRecord = RecordBase & {
  mode: "outside";
};

export type LocationRecord = StationLocationRecord | OutsideLocationRecord;

type StationLocationRecordInput = {
  mode: "station";
  lane?: string;
  side?: Side;
  rackLevel?: RackLevel;
  distance?: Distance;
  floor?: string;
  rackNumber?: string;
  notes?: string;
  photoId?: string;
  coords?: Coords;
};

type OutsideLocationRecordInput = {
  mode: "outside";
  notes?: string;
  photoId?: string;
  coords?: Coords;
};

export type LocationRecordInput = StationLocationRecordInput | OutsideLocationRecordInput;

export type AppData = {
  station: StationConfig;
  current: LocationRecord | null;
  recent: LocationRecord[];
};

export const RECENT_LIMIT = 5;
