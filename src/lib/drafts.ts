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

// The draft describes a NEW parking event, so it carries over structural
// habits (mode, lane, side, floor, ...) but never the previous spot's
// evidence — notes, photo, GPS coords, and rack number belong to the old spot.
export function createLocationDraft(
  current: LocationRecord | null,
  station: StationConfig,
): LocationDraft {
  if (!current) {
    return {
      kind: "station",
      lane: station.laneLabels[0] ?? "",
      side: "right",
      rackLevel: "bottom",
      distance: "middle",
      floor: station.floorLabels[0] ?? "",
      rackNumber: "",
      notes: "",
      photoFile: null,
      coords: null,
    };
  }

  if (current.mode === "outside") {
    return createOutsideLocationDraft();
  }

  return {
    kind: "station",
    lane: current.lane ?? station.laneLabels[0] ?? "",
    side: current.side ?? "right",
    rackLevel: current.rackLevel ?? "bottom",
    distance: current.distance ?? "middle",
    floor: current.floor ?? station.floorLabels[0] ?? "",
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

  const lane = station.enabledFields.lane ? draft.lane.trim() : undefined;

  // Lane is required only when the field is enabled.
  if (station.enabledFields.lane && !lane) {
    return null;
  }

  return {
    mode: "station",
    lane,
    side: station.enabledFields.side ? draft.side : undefined,
    rackLevel: station.enabledFields.rackLevel ? draft.rackLevel : undefined,
    distance: station.enabledFields.distance ? draft.distance : undefined,
    floor: station.enabledFields.floor ? emptyToUndefined(draft.floor) : undefined,
    rackNumber: station.enabledFields.rackNumber ? emptyToUndefined(draft.rackNumber) : undefined,
    notes: emptyToUndefined(draft.notes),
    coords: draft.coords ?? undefined,
  };
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
