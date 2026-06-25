import type { FieldInputMode } from '@/lib/app-data';

// Editor-side value input for one location field (lane or floor): quick preset
// buttons when configured, otherwise a free-text input.
export function FieldValueInput({
  noun,
  mode,
  labels,
  value,
  onChange,
}: {
  noun: string;
  mode: FieldInputMode;
  labels: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (mode === 'quick') {
    return (
      <fieldset className="segmented-field">
        <legend>{noun}</legend>
        <div className="segmented-field__options segmented-field__options--fit">
          {labels.map((label) => (
            <button
              key={label}
              aria-label={`${noun} ${label}`}
              aria-pressed={value === label}
              className={
                value === label ? 'segment segment--dense is-active' : 'segment segment--dense'
              }
              type="button"
              onClick={() => onChange(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <label className="field">
      <span>{noun}</span>
      <input
        aria-label={noun}
        type="text"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}
