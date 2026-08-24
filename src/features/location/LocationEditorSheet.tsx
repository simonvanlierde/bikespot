import type { TargetedEvent } from "preact";
import type { Dispatch, SetStateAction } from "preact/compat";
import { CoordsField } from "@/components/CoordsField";
import { NotesField } from "@/components/NotesField";
import { PhotoField } from "@/components/PhotoField";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SheetDialog } from "@/components/SheetDialog";
import type { StationConfig } from "@/lib/app-data";
import { createLocationDraft, createOutsideLocationDraft, type LocationDraft } from "@/lib/drafts";
import { t } from "@/lib/i18n";
import { StationLocationFields, type UpdateStationField } from "./StationLocationFields";

const WHERE_OPTIONS: LocationDraft["kind"][] = ["station", "outside"];

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: JSX render fn; markup dominates the line count
export function LocationEditorSheet({
  formState,
  station,
  showDetails,
  geoStatus,
  error,
  title,
  setFormState,
  onClose,
  onSubmit,
  onToggleDetails,
  onPhotoChange,
  onPhotoRemove,
  onCaptureLocation,
}: {
  formState: LocationDraft;
  station: StationConfig;
  showDetails: boolean;
  geoStatus: "idle" | "capturing" | "error";
  error: string | null;
  title: string;
  setFormState: Dispatch<SetStateAction<LocationDraft>>;
  onClose: () => void;
  onSubmit: (event: TargetedEvent<HTMLFormElement>) => void;
  onToggleDetails: () => void;
  onPhotoChange: (event: TargetedEvent<HTMLInputElement>) => void;
  onPhotoRemove: () => void;
  onCaptureLocation: () => void;
}) {
  function updateNotes(notes: string) {
    setFormState((previous) => ({
      ...previous,
      notes,
    }));
  }

  const updateStationField: UpdateStationField = (field, value) => {
    setFormState((previous) =>
      previous.kind === "station"
        ? {
            ...previous,
            [field]: value,
          }
        : previous,
    );
  };

  function switchMode(kind: LocationDraft["kind"]) {
    if (kind !== formState.kind) {
      setFormState(
        kind === "outside" ? createOutsideLocationDraft() : createLocationDraft(null, station),
      );
    }
  }

  return (
    <SheetDialog closeLabel={t.value.cancel} label={title} title={title} onClose={onClose}>
      <form className="editor-form" noValidate onSubmit={onSubmit}>
        <SegmentedControl
          label={t.value.whereParked}
          options={WHERE_OPTIONS}
          value={formState.kind}
          onChange={switchMode}
          titleCase={(option) => t.value.whereOpts[option]}
        />

        {formState.kind === "outside" ? (
          <>
            <NotesField value={formState.notes} onChange={updateNotes} />
            <CoordsField
              coords={formState.coords}
              status={geoStatus}
              onCapture={onCaptureLocation}
            />
            <PhotoField
              photoFile={formState.photoFile}
              onPhotoChange={onPhotoChange}
              onPhotoRemove={onPhotoRemove}
            />
          </>
        ) : (
          <StationLocationFields
            formState={formState}
            station={station}
            showDetails={showDetails}
            geoStatus={geoStatus}
            laneInvalid={Boolean(error) && !formState.lane.trim()}
            updateStationField={updateStationField}
            onNotesChange={updateNotes}
            onToggleDetails={onToggleDetails}
            onPhotoChange={onPhotoChange}
            onPhotoRemove={onPhotoRemove}
            onCaptureLocation={onCaptureLocation}
          />
        )}

        <div className="editor-form__submit">
          <p className="form-error" role="alert">
            {error}
          </p>
          <button className="primary-button primary-button--wide" type="submit">
            {t.value.saveLocation}
          </button>
        </div>
      </form>
    </SheetDialog>
  );
}
