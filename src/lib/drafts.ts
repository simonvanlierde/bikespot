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
} from "./app-data";

export type StationLocationDraft = {
  kind: "station";
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
  kind: "outside";
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

// The draft describes a NEW parking event. In a Dutch station you rarely get
// the same spot twice, but usually the same floor: carry the floor over, start
// every other locator (lane, side, rack, distance) and all evidence fresh, so a
// careless tap can never re-save yesterday's lane as today's.
export function createLocationDraft(
  current: LocationRecord | null,
  station: StationConfig,
): LocationDraft {
  if (current?.mode === "outside") {
    return createOutsideLocationDraft();
  }

  return {
    kind: "station",
    lane: "",
    side: "right",
    rackLevel: "bottom",
    distance: "middle",
    floor: current?.floor ?? station.floorLabels[0] ?? "",
    rackNumber: "",
    notes: "",
    photoFile: null,
    coords: null,
  };
}

export function createOutsideLocationDraft(): OutsideLocationDraft {
  return {
    kind: "outside",
    notes: "",
    photoFile: null,
    coords: null,
  };
}

export function buildLocationRecordInput(
  draft: LocationDraft,
  station: StationConfig,
): LocationRecordInput | null {
  if (draft.kind === "outside") {
    const outsideDescription = draft.notes.trim();

    // Savable as long as the spot carries something to find it by: a note, a
    // photo, or a GPS fix.
    if (!(outsideDescription || draft.photoFile || draft.coords)) {
      return null;
    }

    return {
      mode: "outside",
      outsideDescription: outsideDescription || undefined,
      coords: draft.coords ?? undefined,
    };
  }

  return buildStationInput(draft, station);
}

function buildStationInput(
  draft: StationLocationDraft,
  station: StationConfig,
): LocationRecordInput | null {
  const { enabledFields } = station;
  const lane = enabledFields.lane ? draft.lane.trim() : undefined;

  // Lane is required only when the field is enabled.
  if (enabledFields.lane && !lane) {
    return null;
  }

  const input: LocationRecordInput = {
    mode: "station",
    lane,
    side: enabledFields.side ? draft.side : undefined,
    rackLevel: enabledFields.rackLevel ? draft.rackLevel : undefined,
    distance: enabledFields.distance ? draft.distance : undefined,
    floor: enabledFields.floor ? emptyToUndefined(draft.floor) : undefined,
    rackNumber: enabledFields.rackNumber ? emptyToUndefined(draft.rackNumber) : undefined,
    notes: emptyToUndefined(draft.notes),
    coords: draft.coords ?? undefined,
  };

  // With every field disabled the record would be blank and displace the real
  // current spot; require something to find the bike by, like the outside branch.
  const { mode: _mode, ...values } = input;
  if (!(draft.photoFile || Object.values(values).some((value) => value !== undefined))) {
    return null;
  }

  return input;
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
