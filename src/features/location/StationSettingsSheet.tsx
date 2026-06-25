import type { TargetedEvent } from 'preact';
import { Fragment } from 'preact';
import type { Dispatch, SetStateAction } from 'preact/compat';

import { SheetDialog } from '@/components/SheetDialog';
import { ToggleField } from '@/components/ToggleField';
import type { StationSettingsDraft } from '@/lib/drafts';
import { FieldInputSettings } from './FieldInputSettings';

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
  onSubmit: (event: TargetedEvent<HTMLFormElement>) => void;
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
            <Fragment key={option.key}>
              <ToggleField
                checked={stationForm.enabledFields[option.key]}
                label={option.label}
                onChange={(checked) => updateFieldToggle(option.key, checked)}
              />
              {option.key === 'floor' && stationForm.enabledFields.floor ? (
                <FieldInputSettings
                  noun="floor"
                  legend="Floor input"
                  mode={stationForm.floorInputMode}
                  labels={stationForm.floorLabels}
                  onModeChange={(mode) => updateStationField('floorInputMode', mode)}
                  onLabelsChange={(labels) => updateStationField('floorLabels', labels)}
                />
              ) : null}
              {option.key === 'lane' && stationForm.enabledFields.lane ? (
                <FieldInputSettings
                  noun="lane"
                  legend="Lane input"
                  mode={stationForm.laneInputMode}
                  labels={stationForm.laneLabels}
                  onModeChange={(mode) => updateStationField('laneInputMode', mode)}
                  onLabelsChange={(labels) => updateStationField('laneLabels', labels)}
                />
              ) : null}
            </Fragment>
          ))}
        </fieldset>

        <button className="primary-button primary-button--wide" type="submit">
          Save station settings
        </button>
      </form>
    </SheetDialog>
  );
}
