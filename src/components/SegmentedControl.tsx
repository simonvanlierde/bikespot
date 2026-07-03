import type { ReactNode } from 'preact/compat';

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
  titleCase: (value?: string) => string;
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
            className={`segment${value === option ? ' is-active' : ''}`}
            onClick={() => onChange(option)}
            type="button"
          >
            {titleCase(option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
