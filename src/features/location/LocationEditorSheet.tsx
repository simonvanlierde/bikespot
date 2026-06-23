import { ArrowRightLeft, CircleHelp, Undo2 } from 'lucide-preact';

import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'preact/compat';
import { NotesField } from '../../components/NotesField';
import { PhotoField } from '../../components/PhotoField';
import { SegmentedControl } from '../../components/SegmentedControl';
import { SheetDialog } from '../../components/SheetDialog';
import type { StationConfig } from '../../lib/app-data';
import {
  createLocationDraft,
  createOutsideLocationDraft,
  type LocationDraft,
  type OutsideLocationDraft,
  type StationLocationDraft,
} from '../../lib/drafts';
import { titleCase } from './display';

type UpdateStationField = <K extends keyof StationLocationDraft>(
  field: K,
  value: StationLocationDraft[K],
) => void;

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <span aria-hidden="true" className="chevron">
      {expanded ? '⌄' : '›'}
    </span>
  );
}

function OutsideLocationFields({
  formState,
  onNotesChange,
  onPhotoChange,
}: {
  formState: OutsideLocationDraft;
  onNotesChange: (notes: string) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <NotesField prominent value={formState.notes} onChange={onNotesChange} />
      <PhotoField onPhotoChange={onPhotoChange} />
    </>
  );
}

function StationLocationFields({
  formState,
  station,
  showDetails,
  updateStationField,
  onNotesChange,
  onToggleDetails,
  onPhotoChange,
}: {
  formState: StationLocationDraft;
  station: StationConfig;
  showDetails: boolean;
  updateStationField: UpdateStationField;
  onNotesChange: (notes: string) => void;
  onToggleDetails: () => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      {station.enabledFields.lane ? (
        station.laneInputMode === 'quick' ? (
          <fieldset className="segmented-field">
            <legend>Lane</legend>
            <div className="segmented-field__options segmented-field__options--fit">
              {station.laneLabels.map((lane) => (
                <button
                  key={lane}
                  aria-label={`Lane ${lane}`}
                  aria-pressed={formState.lane === lane}
                  className={
                    formState.lane === lane
                      ? 'segment segment--dense is-active'
                      : 'segment segment--dense'
                  }
                  type="button"
                  onClick={() => updateStationField('lane', lane)}
                >
                  {lane}
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <label className="field field--prominent">
            <span>Lane</span>
            <input
              aria-label="Lane"
              type="text"
              value={formState.lane}
              onChange={(event) => updateStationField('lane', event.currentTarget.value)}
            />
          </label>
        )
      ) : null}

      {station.enabledFields.side ? (
        <SegmentedControl
          label="Side"
          layout="fit"
          options={['left', 'right']}
          value={formState.side}
          onChange={(side) => updateStationField('side', side)}
          titleCase={titleCase}
        />
      ) : null}

      {station.enabledFields.rackLevel ? (
        <SegmentedControl
          label="Rack level"
          layout="fit"
          options={['top', 'bottom']}
          value={formState.rackLevel}
          onChange={(rackLevel) => updateStationField('rackLevel', rackLevel)}
          titleCase={titleCase}
        />
      ) : null}

      {station.enabledFields.distance ? (
        <SegmentedControl
          label="Distance"
          labelSuffix={
            <button aria-label="Distance help" className="info-trigger" type="button">
              <CircleHelp aria-hidden="true" className="button-icon" />
              <span className="info-tooltip">
                Close = near the entrance. Medium = around the middle. Far = deeper inside.
              </span>
            </button>
          }
          layout="fit"
          options={['close', 'medium', 'far']}
          value={formState.distance}
          onChange={(distance) => updateStationField('distance', distance)}
          titleCase={titleCase}
        />
      ) : null}

      <button
        aria-expanded={showDetails}
        className="ghost-button ghost-button--wide details-toggle"
        type="button"
        onClick={onToggleDetails}
      >
        <span>More details</span>
        <Chevron expanded={showDetails} />
      </button>

      {showDetails ? (
        <div className="details-panel">
          {station.enabledFields.floor ? (
            <label className="field field--secondary">
              <span>Station floor</span>
              <input
                aria-label="Station floor"
                value={formState.floor}
                onChange={(event) => updateStationField('floor', event.currentTarget.value)}
              />
            </label>
          ) : null}

          {station.enabledFields.rackNumber ? (
            <label className="field">
              <span>Rack number</span>
              <input
                aria-label="Rack number"
                value={formState.rackNumber}
                onChange={(event) => updateStationField('rackNumber', event.currentTarget.value)}
              />
            </label>
          ) : null}
          <NotesField value={formState.notes} onChange={onNotesChange} />
          <PhotoField onPhotoChange={onPhotoChange} />
        </div>
      ) : null}
    </>
  );
}

export function LocationEditorSheet({
  formState,
  station,
  showDetails,
  setFormState,
  onClose,
  onSubmit,
  onToggleDetails,
  onPhotoChange,
}: {
  formState: LocationDraft;
  station: StationConfig;
  showDetails: boolean;
  setFormState: Dispatch<SetStateAction<LocationDraft>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleDetails: () => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  function updateNotes(notes: string) {
    setFormState((previous) => ({
      ...previous,
      notes,
    }));
  }

  const updateStationField: UpdateStationField = (field, value) => {
    setFormState((previous) =>
      previous.kind === 'station'
        ? {
            ...previous,
            [field]: value,
          }
        : previous,
    );
  };

  return (
    <SheetDialog
      closeLabel="Cancel"
      label="Change location"
      title="Change location"
      onClose={onClose}
    >
      <div className="sheet-header__main">
        <div className="mode-switch">
          {formState.kind === 'station' ? (
            <button
              className="text-button text-button--switch"
              type="button"
              onClick={() => setFormState(createOutsideLocationDraft())}
            >
              <ArrowRightLeft aria-hidden="true" className="button-icon" />
              <span>Parked outside instead</span>
            </button>
          ) : (
            <button
              className="text-button text-button--switch"
              type="button"
              onClick={() => setFormState(createLocationDraft(null, station))}
            >
              <Undo2 aria-hidden="true" className="button-icon" />
              <span>Back to station</span>
            </button>
          )}
        </div>
      </div>

      <form className="editor-form" onSubmit={onSubmit}>
        {formState.kind === 'outside' ? (
          <OutsideLocationFields
            formState={formState}
            onNotesChange={updateNotes}
            onPhotoChange={onPhotoChange}
          />
        ) : (
          <StationLocationFields
            formState={formState}
            station={station}
            showDetails={showDetails}
            updateStationField={updateStationField}
            onNotesChange={updateNotes}
            onToggleDetails={onToggleDetails}
            onPhotoChange={onPhotoChange}
          />
        )}

        <button className="primary-button primary-button--wide" type="submit">
          Save location
        </button>
      </form>
    </SheetDialog>
  );
}
