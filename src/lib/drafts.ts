import type {
  Coords,
  Distance,
  EnabledFields,
  FieldInputMode,
  LocationRecord,
  LocationRecordInput,
  RackLevel,
  Side,
  StationConfig,
} from './app-data';
import { defaultStationConfig } from './defaults';

export type StationLocationDraft = {
  kind: 'station';
  lane: string;
  side: Side;
  rackLevel: RackLevel;
  distance: Distance;
  floor: string;
  rackNumber: string;
  notes: string;
  photoFile: File | null;
  coords: Coords | null;
};

export type OutsideLocationDraft = {
  kind: 'outside';
  notes: string;
  photoFile: File | null;
  coords: Coords | null;
};

export type LocationDraft = StationLocationDraft | OutsideLocationDraft;

export type StationSettingsDraft = {
  name: string;
  laneInputMode: FieldInputMode;
  laneLabels: string[];
  floorInputMode: FieldInputMode;
  floorLabels: string[];
  enabledFields: EnabledFields;
};

export function createStationSettingsDraft(station: StationConfig): StationSettingsDraft {
  return {
    name: station.name,
    laneInputMode: station.laneInputMode,
    laneLabels: [...station.laneLabels],
    floorInputMode: station.floorInputMode,
    floorLabels: [...station.floorLabels],
    enabledFields: { ...station.enabledFields },
  };
}

export function createLocationDraft(
  current: LocationRecord | null,
  station: StationConfig,
): LocationDraft {
  if (!current) {
    return {
      kind: 'station',
      lane: station.laneLabels[0] ?? '',
      side: 'right',
      rackLevel: 'bottom',
      distance: 'medium',
      floor: station.floorLabels[0] ?? '',
      rackNumber: '',
      notes: '',
      photoFile: null,
      coords: null,
    };
  }

  return {
    kind: 'station',
    lane: current.mode === 'station' ? (current.lane ?? station.laneLabels[0] ?? '') : '',
    side: current.mode === 'station' ? (current.side ?? 'right') : 'right',
    rackLevel: current.mode === 'station' ? (current.rackLevel ?? 'bottom') : 'bottom',
    distance: current.mode === 'station' ? (current.distance ?? 'medium') : 'medium',
    floor:
      current.mode === 'station'
        ? (current.floor ?? station.floorLabels[0] ?? '')
        : (station.floorLabels[0] ?? ''),
    rackNumber: current.mode === 'station' ? (current.rackNumber ?? '') : '',
    notes: current.mode === 'station' ? (current.notes ?? '') : '',
    photoFile: null,
    coords: current.coords ?? null,
  };
}

export function createOutsideLocationDraft(): OutsideLocationDraft {
  return {
    kind: 'outside',
    notes: '',
    photoFile: null,
    coords: null,
  };
}

export function buildLocationRecordInput(
  draft: LocationDraft,
  station: StationConfig,
  photoId?: string,
): LocationRecordInput | null {
  if (draft.kind === 'outside') {
    const outsideDescription = draft.notes.trim();

    if (!outsideDescription) {
      return null;
    }

    return {
      mode: 'outside',
      outsideDescription,
      photoId,
      coords: draft.coords ?? undefined,
    };
  }

  const lane = station.enabledFields.lane ? draft.lane.trim() : undefined;

  // Lane is required only when the field is enabled.
  if (station.enabledFields.lane && !lane) {
    return null;
  }

  return {
    mode: 'station',
    lane,
    side: station.enabledFields.side ? draft.side : undefined,
    rackLevel: station.enabledFields.rackLevel ? draft.rackLevel : undefined,
    distance: station.enabledFields.distance ? draft.distance : undefined,
    floor: station.enabledFields.floor ? emptyToUndefined(draft.floor) : undefined,
    rackNumber: station.enabledFields.rackNumber ? emptyToUndefined(draft.rackNumber) : undefined,
    notes: emptyToUndefined(draft.notes),
    photoId,
    coords: draft.coords ?? undefined,
  };
}

export function buildStationConfig(draft: StationSettingsDraft): StationConfig {
  const cleanLabels = (labels: string[], fallback: string[]) => {
    const trimmed = labels.map((label) => label.trim()).filter(Boolean);
    return trimmed.length > 0 ? trimmed : fallback;
  };

  return {
    name: draft.name.trim() || defaultStationConfig.name,
    laneInputMode: draft.laneInputMode,
    laneLabels: cleanLabels(draft.laneLabels, defaultStationConfig.laneLabels),
    floorInputMode: draft.floorInputMode,
    floorLabels: cleanLabels(draft.floorLabels, defaultStationConfig.floorLabels),
    enabledFields: { ...draft.enabledFields },
  };
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
