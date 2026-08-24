import { Plus, X } from "lucide-preact";
import { useLayoutEffect, useRef } from "preact/hooks";

import { titleCase } from "@/features/location/display";
import type { FieldInputMode } from "@/lib/app-data";
import { t } from "@/lib/i18n";

// Settings-side config for one location field (lane or floor): a Quick/Number
// mode switch plus, in quick mode, an add/remove editor for the preset labels.
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: JSX render fn; markup dominates the line count
export function FieldInputSettings({
  field,
  noun,
  legend,
  mode,
  labels,
  onModeChange,
  onLabelsChange,
}: {
  field: "lane" | "floor";
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
    onLabelsChange([...labels, ""]);
  }

  // Removing a row unmounts the focused button; land focus on the next remove
  // button (or the add button) so keyboard users keep their place.
  const editorRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<number | null>(null);

  useLayoutEffect(() => {
    const index = pendingFocus.current;
    if (index === null) {
      return;
    }
    pendingFocus.current = null;
    const removes =
      editorRef.current?.querySelectorAll<HTMLButtonElement>(".labels-editor__remove");
    const target = removes?.[Math.min(index, removes.length - 1)];
    (target ?? editorRef.current?.querySelector<HTMLButtonElement>(".labels-editor__add"))?.focus();
  });

  function removeLabel(index: number) {
    rowIds.current = rowIds.current.filter((_, idIndex) => idIndex !== index);
    pendingFocus.current = index;
    onLabelsChange(labels.filter((_, labelIndex) => labelIndex !== index));
  }

  return (
    <div className="field-config">
      <fieldset className="segmented-field segmented-field--compact">
        <legend>{legend}</legend>
        <div className="segmented-field__options segmented-field__options--two">
          <button
            aria-pressed={mode === "number"}
            className={mode === "number" ? "segment is-active" : "segment"}
            type="button"
            onClick={() => onModeChange("number")}
          >
            {t.value.numberInput}
          </button>
          <button
            aria-pressed={mode === "quick"}
            className={mode === "quick" ? "segment is-active" : "segment"}
            type="button"
            onClick={() => onModeChange("quick")}
          >
            {t.value.quickMode[field]}
          </button>
        </div>
      </fieldset>

      {mode === "quick" ? (
        <div className="labels-editor" ref={editorRef}>
          {labels.map((label, index) => (
            <div className="labels-editor__row" key={`${noun}-label-${rowIds.current[index]}`}>
              <label className="field labels-editor__field">
                <span>{t.value.presetLabel(Noun, index + 1)}</span>
                <input
                  aria-label={t.value.presetLabel(Noun, index + 1)}
                  value={label}
                  onInput={(event) => updateLabel(index, event.currentTarget.value)}
                />
              </label>
              {labels.length > 1 ? (
                <button
                  aria-label={t.value.removePreset(noun, index + 1)}
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
            {t.value.addPreset(noun)}
          </button>
        </div>
      ) : null}
    </div>
  );
}
