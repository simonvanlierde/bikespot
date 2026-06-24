import type { Dispatch, FormEvent, SetStateAction } from 'preact/compat';

import { SheetDialog } from '../../components/SheetDialog';
import { ToggleField } from '../../components/ToggleField';
import type { StationSettingsDraft } from '../../lib/drafts';

const ENABLED_FIELD_OPTIONS = [
  { key: 'side', label: 'Side' },
  { key: 'rackLevel', label: 'Rack level' },
  { key: 'distance', label: 'Distance' },
  { key: 'floor', label: 'Floor' },
  { key: 'rackNumber', label: 'Rack number' },
] as const;

const LOCATION_CAPTURE_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: 'ask', label: 'Ask' },
  { value: 'always', label: 'Always' },
] as const;

export function StationSettingsSheet({
  stationForm,
  setStationForm,
  onClose,
  onSubmit,
}: {
  stationForm: StationSettingsDraft;
  setStationForm: Dispatch<SetStateAction<StationSettingsDraft>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function updateStationField<K extends keyof StationSettingsDraft>(
    field: K,
    value: StationSettingsDraft[K],
  ) {
    setStationForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateLaneLabel(index: number, value: string) {
    setStationForm((previous) => ({
      ...previous,
      laneLabels: previous.laneLabels.map((label, laneIndex) =>
        laneIndex === index ? value : label,
      ),
    }));
  }

  function updateEnabledField(
    field: (typeof ENABLED_FIELD_OPTIONS)[number]['key'],
    checked: boolean,
  ) {
    setStationForm((previous) => ({
      ...previous,
      enabledFields: { ...previous.enabledFields, [field]: checked },
    }));
  }

  return (
    <SheetDialog
      closeLabel="Cancel"
      label="Station settings"
      title="Station settings"
      onClose={onClose}
    >
      <form className="editor-form" onSubmit={onSubmit}>
        <label className="field field--prominent">
          <span>Station name</span>
          <input
            aria-label="Station name"
            value={stationForm.name}
            onChange={(event) => updateStationField('name', event.currentTarget.value)}
          />
        </label>

        <fieldset className="segmented-field">
          <legend>Lane input</legend>
          <div className="segmented-field__options segmented-field__options--two">
            <button
              aria-pressed={stationForm.laneInputMode === 'quick'}
              className={stationForm.laneInputMode === 'quick' ? 'segment is-active' : 'segment'}
              type="button"
              onClick={() => updateStationField('laneInputMode', 'quick')}
            >
              Quick lanes
            </button>
            <button
              aria-pressed={stationForm.laneInputMode === 'number'}
              className={stationForm.laneInputMode === 'number' ? 'segment is-active' : 'segment'}
              type="button"
              onClick={() => updateStationField('laneInputMode', 'number')}
            >
              Number input
            </button>
          </div>
        </fieldset>

        <div className="settings-grid">
          {stationForm.laneLabels.map((label, index) => (
            <label className="field" key={`lane-label-${index + 1}`}>
              <span>Lane label {index + 1}</span>
              <input
                aria-label={`Lane label ${index + 1}`}
                value={label}
                onChange={(event) => updateLaneLabel(index, event.currentTarget.value)}
              />
            </label>
          ))}
        </div>

        <label className="field field--secondary">
          <span>Default floor</span>
          <input
            aria-label="Default floor"
            value={stationForm.defaultFloor}
            onChange={(event) => updateStationField('defaultFloor', event.currentTarget.value)}
          />
        </label>

        <fieldset className="segmented-field">
          <legend>Save GPS location</legend>
          <div className="segmented-field__options segmented-field__options--fit">
            {LOCATION_CAPTURE_OPTIONS.map((option) => (
              <button
                aria-pressed={stationForm.locationCapture === option.value}
                className={
                  stationForm.locationCapture === option.value ? 'segment is-active' : 'segment'
                }
                key={option.value}
                type="button"
                onClick={() => updateStationField('locationCapture', option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="settings-fieldset">
          <legend>Enabled fields</legend>
          {ENABLED_FIELD_OPTIONS.map((option) => (
            <ToggleField
              checked={stationForm.enabledFields[option.key]}
              key={option.key}
              label={option.label}
              onChange={(checked) => updateEnabledField(option.key, checked)}
            />
          ))}
        </fieldset>

        <button className="primary-button primary-button--wide" type="submit">
          Save station settings
        </button>
      </form>
    </SheetDialog>
  );
}
