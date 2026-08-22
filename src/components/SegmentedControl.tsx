import type { ReactNode } from "preact/compat";

// Arrow keys move the selection like a native radio group (the buttons stay
// aria-pressed toggles, which AT already announces with state).
export function segmentKeyHandler<T>(options: T[], value: T, onChange: (value: T) => void) {
  return (event: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) {
      return;
    }
    event.preventDefault();
    const index = (options.indexOf(value) + step + options.length) % options.length;
    onChange(options[index]);
    (event.currentTarget as HTMLElement).parentElement
      ?.querySelectorAll<HTMLButtonElement>("button")
      [index]?.focus();
  };
}

export function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
  titleCase,
  labelSuffix,
}: {
  label: string;
  onChange: (value: T) => void;
  options: T[];
  value: T;
  // Renders one option value for display (segment text + aria-label); pass a
  // translator or titleCase.
  titleCase: (value: T) => string;
  labelSuffix?: ReactNode;
}) {
  return (
    <fieldset className="segmented-field">
      <legend className="segmented-field__legend">
        <span>{label}</span>
        {labelSuffix}
      </legend>
      <div className="segmented-field__options segmented-field__options--fit">
        {options.map((option) => (
          <button
            key={option}
            aria-label={`${label} ${titleCase(option)}`}
            aria-pressed={value === option}
            className={`segment${value === option ? " is-active" : ""}`}
            onClick={() => onChange(option)}
            onKeyDown={segmentKeyHandler(options, value, onChange)}
            type="button"
          >
            {titleCase(option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
