import { ChevronDown, ChevronRight, CircleHelp } from 'lucide-preact';
import type { TargetedEvent } from 'preact';
import { CoordsField } from '@/components/CoordsField';
import { NotesField } from '@/components/NotesField';
import { PhotoField } from '@/components/PhotoField';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { StationConfig } from '@/lib/app-data';
import type { StationLocationDraft } from '@/lib/drafts';
import { titleCase } from './display';
import { FieldValueInput } from './FieldValueInput';

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
  geoStatus: 'idle' | 'capturing' | 'error';
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
          noun="Floor"
          mode={station.floorInputMode}
          labels={station.floorLabels}
          value={formState.floor}
          onChange={(value) => updateStationField('floor', value)}
        />
      ) : null}

      {station.enabledFields.lane ? (
        <FieldValueInput
          noun="Lane"
          mode={station.laneInputMode}
          labels={station.laneLabels}
          value={formState.lane}
          onChange={(value) => updateStationField('lane', value)}
        />
      ) : null}

      {station.enabledFields.distance ? (
        <SegmentedControl
          label="Distance"
          labelSuffix={
            <button aria-label="Distance help" className="info-trigger" type="button">
              <CircleHelp aria-hidden="true" className="button-icon" />
              <span className="info-tooltip">
                Close = near the entrance. Middle = around the middle. Far = deeper inside.
              </span>
            </button>
          }
          options={['close', 'middle', 'far']}
          value={formState.distance}
          onChange={(distance) => updateStationField('distance', distance)}
          titleCase={titleCase}
        />
      ) : null}

      {station.enabledFields.side ? (
        <SegmentedControl
          label="Side"
          options={['left', 'right']}
          value={formState.side}
          onChange={(side) => updateStationField('side', side)}
          titleCase={titleCase}
        />
      ) : null}

      {station.enabledFields.rackLevel ? (
        <SegmentedControl
          label="Rack level"
          options={['top', 'bottom']}
          value={formState.rackLevel}
          onChange={(rackLevel) => updateStationField('rackLevel', rackLevel)}
          titleCase={titleCase}
        />
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
