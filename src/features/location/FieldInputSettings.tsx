import { Plus, X } from 'lucide-preact';

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
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);

  function updateLabel(index: number, value: string) {
    onLabelsChange(labels.map((label, labelIndex) => (labelIndex === index ? value : label)));
  }

  function addLabel() {
    onLabelsChange([...labels, '']);
  }

  function removeLabel(index: number) {
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
            <div className="labels-editor__row" key={`${noun}-label-${index + 1}`}>
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
