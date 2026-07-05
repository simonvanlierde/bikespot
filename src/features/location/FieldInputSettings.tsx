import { Plus, X } from 'lucide-preact';
import { useRef } from 'preact/hooks';

import { titleCase } from '@/features/location/display';
import type { FieldInputMode } from '@/lib/app-data';

// Settings-side config for one location field (lane or floor): a Quick/Number
// mode switch plus, in quick mode, an add/remove editor for the preset labels.
export function FieldInputSettings({
  noun,
  legend,
  mode,
  labels,
  onModeChange,
  onLabelsChange,
}: {
  noun: string;
  legend: string;
  mode: FieldInputMode;
  labels: string[];
  onModeChange: (mode: FieldInputMode) => void;
  onLabelsChange: (labels: string[]) => void;
}) {
  const Noun = titleCase(noun);

  // Stable identity per row: keying by index would reuse DOM inputs by
  // position when a middle row is removed, dropping caret/focus onto the
  // wrong field. Handlers update the ids in lockstep with the labels; the
  // render-time resync covers mount and external label changes.
  const nextRowId = useRef(0);
  const rowIds = useRef<number[]>([]);

  if (rowIds.current.length !== labels.length) {
    rowIds.current = labels.map(() => nextRowId.current++);
  }

  function updateLabel(index: number, value: string) {
    onLabelsChange(labels.map((label, labelIndex) => (labelIndex === index ? value : label)));
  }

  function addLabel() {
    rowIds.current = [...rowIds.current, nextRowId.current++];
    onLabelsChange([...labels, '']);
  }

  function removeLabel(index: number) {
    rowIds.current = rowIds.current.filter((_, idIndex) => idIndex !== index);
    onLabelsChange(labels.filter((_, labelIndex) => labelIndex !== index));
  }

  return (
    <div className="field-config">
      <fieldset className="segmented-field segmented-field--compact">
        <legend>{legend}</legend>
        <div className="segmented-field__options segmented-field__options--two">
          <button
            aria-pressed={mode === 'number'}
            className={mode === 'number' ? 'segment is-active' : 'segment'}
            type="button"
            onClick={() => onModeChange('number')}
          >
            Number input
          </button>
          <button
            aria-pressed={mode === 'quick'}
            className={mode === 'quick' ? 'segment is-active' : 'segment'}
            type="button"
            onClick={() => onModeChange('quick')}
          >
            Quick {noun}s
          </button>
        </div>
      </fieldset>

      {mode === 'quick' ? (
        <div className="labels-editor">
          {labels.map((label, index) => (
            <div className="labels-editor__row" key={`${noun}-label-${rowIds.current[index]}`}>
              <label className="field labels-editor__field">
                <span>
                  {Noun} {index + 1}
                </span>
                <input
                  aria-label={`${Noun} ${index + 1}`}
                  value={label}
                  onChange={(event) => updateLabel(index, event.currentTarget.value)}
                />
              </label>
              {labels.length > 1 ? (
                <button
                  aria-label={`Remove ${noun} ${index + 1}`}
                  className="labels-editor__remove"
                  type="button"
                  onClick={() => removeLabel(index)}
                >
                  <X aria-hidden="true" size={18} />
                </button>
              ) : null}
            </div>
          ))}
          <button
            className="text-button text-button--switch labels-editor__add"
            type="button"
            onClick={addLabel}
          >
            <Plus aria-hidden="true" size={16} />
            Add {noun}
          </button>
        </div>
      ) : null}
    </div>
  );
}
