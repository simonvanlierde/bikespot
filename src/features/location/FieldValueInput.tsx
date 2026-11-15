import { useId } from "preact/hooks";
import { segmentKeyHandler } from "@/components/SegmentedControl";
import type { FieldInputMode } from "@/lib/app-data";

export const EDITOR_ERROR_ID = "editor-error";

// Editor-side value input for one location field (lane or floor): quick preset
// buttons when configured, otherwise a number-keypad text input.
export function FieldValueInput({
  noun,
  mode,
  labels,
  value,
  invalid = false,
  hint,
  onChange,
}: {
  noun: string;
  mode: FieldInputMode;
  labels: string[];
  value: string;
  invalid?: boolean;
  hint?: string;
  onChange: (value: string) => void;
}) {
  const hintId = useId();
  // The lane error is the editor's alert; point the field at it.
  const describedBy = [hint ? hintId : "", invalid ? EDITOR_ERROR_ID : ""].filter(Boolean).join(" ") || undefined;
  if (mode === "quick") {
    return (
      <fieldset className="segmented-field" aria-describedby={describedBy}>
        <legend>{noun}</legend>
        <div className="segmented-field__options segmented-field__options--fit">
          {labels.map((label) => (
            <button
              key={label}
              aria-label={`${noun} ${label}`}
              aria-pressed={value === label}
              className={value === label ? "segment segment--dense is-active" : "segment segment--dense"}
              type="button"
              onClick={() => onChange(label)}
              onKeyDown={segmentKeyHandler(labels, value, onChange)}
            >
              {label}
            </button>
          ))}
        </div>
        {hint ? (
          <p className="field-hint" id={hintId}>
            {hint}
          </p>
        ) : null}
      </fieldset>
    );
  }

  return (
    <label className="field">
      <span>{noun}</span>
      <input
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={noun}
        autoComplete="off"
        inputMode="numeric"
        type="text"
        value={value}
        onInput={(event) => onChange(event.currentTarget.value)}
      />
      {hint ? (
        <span className="field-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
