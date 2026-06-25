export type Side = 'left' | 'right';
export type RackLevel = 'top' | 'bottom';
export type Distance = 'close' | 'medium' | 'far';
export type LaneInputMode = 'quick' | 'number';

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

export const VISIBLE_FIELD_KEYS = ['side', 'rackLevel', 'distance', 'floor', 'rackNumber'] as const;

export const ENABLED_FIELD_KEYS = [
  'lane',
  ...VISIBLE_FIELD_KEYS,
] as const satisfies readonly (keyof EnabledFields)[];

export type StationConfig = {
  name: string;
  laneInputMode: LaneInputMode;
  laneLabels: string[];
  enabledFields: EnabledFields;
  defaultFloor: string;
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

export type StationLocationRecord = RecordBase & {
  mode: 'station';
  lane?: string;
  visibleFields: VisibleFields;
  side?: Side;
  rackLevel?: RackLevel;
  distance?: Distance;
  floor?: string;
  rackNumber?: string;
};

export type OutsideLocationRecord = RecordBase & {
  mode: 'outside';
  outsideDescription: string;
};

export type LocationRecord = StationLocationRecord | OutsideLocationRecord;

export type StationLocationRecordInput = {
  mode: 'station';
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

export type OutsideLocationRecordInput = {
  mode: 'outside';
  outsideDescription: string;
  photoId?: string;
  coords?: Coords;
};

export type LocationRecordInput = StationLocationRecordInput | OutsideLocationRecordInput;

export type AppData = {
  station: StationConfig;
  current: LocationRecord | null;
  recent: LocationRecord[];
};

export type OverlayState =
  | { kind: 'closed' }
  | { kind: 'edit-location' }
  | { kind: 'station-settings' }
  | { kind: 'location-details' }
  | { kind: 'recent-list' }
  | { kind: 'recent-preview'; id: string };

export const RECENT_LIMIT = 5;
