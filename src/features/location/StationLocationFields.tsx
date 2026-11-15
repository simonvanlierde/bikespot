import { ChevronDown, ChevronRight } from "lucide-preact";
import type { TargetedEvent } from "preact";
import { CoordsField } from "@/components/CoordsField";
import { NotesField } from "@/components/NotesField";
import { PhotoField } from "@/components/PhotoField";
import { SegmentedControl } from "@/components/SegmentedControl";
import { DISTANCES, RACK_LEVELS, SIDES, type StationConfig } from "@/lib/app-data";
import type { StationLocationDraft } from "@/lib/drafts";
import { t } from "@/lib/i18n";
import type { OptKey } from "@/lib/i18n/dict";
import { FieldValueInput } from "./FieldValueInput";

const optLabel = (option: OptKey) => t.value.opts[option];

export type UpdateStationField = <K extends keyof StationLocationDraft>(
  field: K,
  value: StationLocationDraft[K],
) => void;

function Chevron({ expanded }: { expanded: boolean }) {
  return expanded ? (
    <ChevronDown aria-hidden="true" className="button-icon" />
  ) : (
    <ChevronRight aria-hidden="true" className="button-icon" />
  );
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: JSX render fn; markup dominates the line count
export function StationLocationFields({
  formState,
  station,
  showDetails,
  geoStatus,
  photoMetadataKept = false,
  laneInvalid = false,
  carriedFloor,
  updateStationField,
  onNotesChange,
  onToggleDetails,
  onPhotoChange,
  onPhotoRemove,
  onCaptureLocation,
}: {
  formState: StationLocationDraft;
  station: StationConfig;
  showDetails: boolean;
  geoStatus: "idle" | "capturing" | "error";
  photoMetadataKept?: boolean;
  laneInvalid?: boolean;
  // The floor of the last spot, when the draft started from it.
  carriedFloor?: string;
  updateStationField: UpdateStationField;
  onNotesChange: (notes: string) => void;
  onToggleDetails: () => void;
  onPhotoChange: (event: TargetedEvent<HTMLInputElement>) => void;
  onPhotoRemove: () => void;
  onCaptureLocation: () => void;
}) {
  return (
    <>
      {/* Enabled fields in broad → specific order (floor → rack number), matching
          the settings and details views. */}
      {station.enabledFields.floor ? (
        <FieldValueInput
          noun={t.value.floor}
          mode={station.floorInputMode}
          labels={station.floorLabels}
          value={formState.floor}
          onChange={(value) => updateStationField("floor", value)}
        />
      ) : null}

      {station.enabledFields.floor && carriedFloor && formState.floor === carriedFloor ? (
        <p className="same-as-last">
          <span className="field-hint">{t.value.sameAsLastTime}</span>
          <button
            className="text-button text-button--switch"
            type="button"
            onClick={(event) => {
              updateStationField("floor", station.floorLabels[0] ?? "");
              // The button unmounts; keep focus inside the sheet.
              event.currentTarget.closest<HTMLElement>("[aria-modal]")?.focus();
            }}
          >
            {t.value.resetFields}
          </button>
        </p>
      ) : null}

      {station.enabledFields.lane ? (
        <FieldValueInput
          noun={t.value.lane}
          hint={t.value.laneHelp}
          mode={station.laneInputMode}
          labels={station.laneLabels}
          value={formState.lane}
          invalid={laneInvalid}
          onChange={(value) => updateStationField("lane", value)}
        />
      ) : null}

      {station.enabledFields.distance ? (
        <SegmentedControl
          label={t.value.distance}
          hint={t.value.distanceHelpText}
          options={DISTANCES}
          value={formState.distance}
          onChange={(distance) => updateStationField("distance", distance)}
          titleCase={optLabel}
        />
      ) : null}

      {station.enabledFields.side ? (
        <SegmentedControl
          label={t.value.side}
          options={SIDES}
          value={formState.side}
          onChange={(side) => updateStationField("side", side)}
          titleCase={optLabel}
        />
      ) : null}

      {station.enabledFields.rackLevel ? (
        <SegmentedControl
          label={t.value.rackLevel}
          options={RACK_LEVELS}
          value={formState.rackLevel}
          onChange={(rackLevel) => updateStationField("rackLevel", rackLevel)}
          titleCase={optLabel}
        />
      ) : null}

      {station.enabledFields.rackNumber ? (
        <label className="field">
          <span>{t.value.rackNumber}</span>
          <input
            aria-label={t.value.rackNumber}
            autoComplete="off"
            value={formState.rackNumber}
            onInput={(event) => updateStationField("rackNumber", event.currentTarget.value)}
          />
        </label>
      ) : null}

      <button
        aria-expanded={showDetails}
        className="ghost-button ghost-button--wide details-toggle"
        type="button"
        onClick={onToggleDetails}
      >
        <span>{t.value.moreDetails}</span>
        <Chevron expanded={showDetails} />
      </button>

      {showDetails ? (
        <div className="details-panel">
          <NotesField value={formState.notes} onChange={onNotesChange} />
          <CoordsField coords={formState.coords} status={geoStatus} onCapture={onCaptureLocation} />
          <PhotoField
            photoFile={formState.photoFile}
            metadataKept={photoMetadataKept}
            onPhotoChange={onPhotoChange}
            onPhotoRemove={onPhotoRemove}
          />
        </div>
      ) : null}
    </>
  );
}
