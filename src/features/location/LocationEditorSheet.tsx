import { ArrowRightLeft, Undo2 } from "lucide-preact";
import type { TargetedEvent } from "preact";
import type { Dispatch, SetStateAction } from "preact/compat";
import { CoordsField } from "@/components/CoordsField";
import { NotesField } from "@/components/NotesField";
import { PhotoField } from "@/components/PhotoField";
import { SheetDialog } from "@/components/SheetDialog";
import type { StationConfig } from "@/lib/app-data";
import { createLocationDraft, createOutsideLocationDraft, type LocationDraft } from "@/lib/drafts";
import { t } from "@/lib/i18n";
import { StationLocationFields, type UpdateStationField } from "./StationLocationFields";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: JSX render fn; markup dominates the line count
export function LocationEditorSheet({
  formState,
  station,
  showDetails,
  geoStatus,
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

  return (
    <SheetDialog
      closeLabel={t.value.cancel}
      label={t.value.changeLocation}
      title={t.value.changeLocation}
      onClose={onClose}
    >
      <div className="sheet-header__main">
        <div className="mode-switch">
          {formState.kind === "station" ? (
            <button
              className="text-button text-button--switch"
              type="button"
              onClick={() => setFormState(createOutsideLocationDraft())}
            >
              <ArrowRightLeft aria-hidden="true" className="button-icon" />
              <span>{t.value.parkedOutside}</span>
            </button>
          ) : (
            <button
              className="text-button text-button--switch"
              type="button"
              onClick={() => setFormState(createLocationDraft(null, station))}
            >
              <Undo2 aria-hidden="true" className="button-icon" />
              <span>{t.value.backToStation}</span>
            </button>
          )}
        </div>
      </div>

      <form className="editor-form" onSubmit={onSubmit}>
        {formState.kind === "outside" ? (
          <>
            <CoordsField
              coords={formState.coords}
              status={geoStatus}
              onCapture={onCaptureLocation}
            />
            <NotesField value={formState.notes} onChange={updateNotes} />
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
            updateStationField={updateStationField}
            onNotesChange={updateNotes}
            onToggleDetails={onToggleDetails}
            onPhotoChange={onPhotoChange}
            onPhotoRemove={onPhotoRemove}
            onCaptureLocation={onCaptureLocation}
          />
        )}

        <button className="primary-button primary-button--wide" type="submit">
          {t.value.saveLocation}
        </button>
      </form>
    </SheetDialog>
  );
}
