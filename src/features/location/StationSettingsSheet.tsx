import type { Dispatch, FormEvent, SetStateAction } from 'preact/compat';

import { SheetDialog } from '../../components/SheetDialog';
import { ToggleField } from '../../components/ToggleField';
import type { StationSettingsDraft } from '../../lib/drafts';

// Field toggles in broad → specific order (floor → rack number), matching the
// editor and details views.
const FIELD_TOGGLE_OPTIONS = [
  { key: 'floor', label: 'Floor' },
  { key: 'lane', label: 'Lane' },
  { key: 'distance', label: 'Distance' },
  { key: 'side', label: 'Side' },
  { key: 'rackLevel', label: 'Rack level' },
  { key: 'rackNumber', label: 'Rack number' },
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

  function updateFieldToggle(key: (typeof FIELD_TOGGLE_OPTIONS)[number]['key'], checked: boolean) {
    setStationForm((previous) => ({
      ...previous,
      enabledFields: { ...previous.enabledFields, [key]: checked },
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
        <fieldset className="settings-fieldset">
          <legend>Enabled fields</legend>
          {FIELD_TOGGLE_OPTIONS.map((option) => (
            <ToggleField
              checked={stationForm.enabledFields[option.key]}
              key={option.key}
              label={option.label}
              onChange={(checked) => updateFieldToggle(option.key, checked)}
            />
          ))}
        </fieldset>

        {stationForm.enabledFields.lane ? (
          <>
            <fieldset className="segmented-field">
              <legend>Lane input</legend>
              <div className="segmented-field__options segmented-field__options--two">
                <button
                  aria-pressed={stationForm.laneInputMode === 'quick'}
                  className={
                    stationForm.laneInputMode === 'quick' ? 'segment is-active' : 'segment'
                  }
                  type="button"
                  onClick={() => updateStationField('laneInputMode', 'quick')}
                >
                  Quick lanes
                </button>
                <button
                  aria-pressed={stationForm.laneInputMode === 'number'}
                  className={
                    stationForm.laneInputMode === 'number' ? 'segment is-active' : 'segment'
                  }
                  type="button"
                  onClick={() => updateStationField('laneInputMode', 'number')}
                >
                  Number input
                </button>
              </div>
            </fieldset>

            {stationForm.laneInputMode === 'quick' ? (
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
            ) : null}
          </>
        ) : null}

        {stationForm.enabledFields.floor ? (
          <label className="field">
            <span>Default floor</span>
            <input
              aria-label="Default floor"
              value={stationForm.defaultFloor}
              onChange={(event) => updateStationField('defaultFloor', event.currentTarget.value)}
            />
          </label>
        ) : null}

        <button className="primary-button primary-button--wide" type="submit">
          Save station settings
        </button>
      </form>
    </SheetDialog>
  );
}
