import { ChevronDown, ChevronRight, CircleHelp } from "lucide-preact";
import type { TargetedEvent } from "preact";
import { CoordsField } from "@/components/CoordsField";
import { NotesField } from "@/components/NotesField";
import { PhotoField } from "@/components/PhotoField";
import { SegmentedControl } from "@/components/SegmentedControl";
import type { StationConfig } from "@/lib/app-data";
import type { StationLocationDraft } from "@/lib/drafts";
import { type OptKey, t } from "@/lib/i18n";
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

      {station.enabledFields.lane ? (
        <FieldValueInput
          noun={t.value.lane}
          mode={station.laneInputMode}
          labels={station.laneLabels}
          value={formState.lane}
          onChange={(value) => updateStationField("lane", value)}
        />
      ) : null}

      {station.enabledFields.distance ? (
        <SegmentedControl
          label={t.value.distance}
          labelSuffix={
            <button
              aria-describedby="distance-help-text"
              aria-label={t.value.distanceHelp}
              className="info-trigger"
              type="button"
            >
              <CircleHelp aria-hidden="true" className="button-icon" />
              <span className="info-tooltip" id="distance-help-text">
                {t.value.distanceHelpText}
              </span>
            </button>
          }
          options={["close", "middle", "far"]}
          value={formState.distance}
          onChange={(distance) => updateStationField("distance", distance)}
          titleCase={optLabel}
        />
      ) : null}

      {station.enabledFields.side ? (
        <SegmentedControl
          label={t.value.side}
          options={["left", "right"]}
          value={formState.side}
          onChange={(side) => updateStationField("side", side)}
          titleCase={optLabel}
        />
      ) : null}

      {station.enabledFields.rackLevel ? (
        <SegmentedControl
          label={t.value.rackLevel}
          options={["top", "bottom"]}
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
            value={formState.rackNumber}
            onChange={(event) => updateStationField("rackNumber", event.currentTarget.value)}
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
          <CoordsField coords={formState.coords} status={geoStatus} onCapture={onCaptureLocation} />
          <NotesField value={formState.notes} onChange={onNotesChange} />
          <PhotoField
            photoFile={formState.photoFile}
            onPhotoChange={onPhotoChange}
            onPhotoRemove={onPhotoRemove}
          />
        </div>
      ) : null}
    </>
  );
}
