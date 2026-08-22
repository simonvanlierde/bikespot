import { Fragment } from "preact";
import type { Dispatch, SetStateAction } from "preact/compat";

import { SegmentedControl } from "@/components/SegmentedControl";
import { SheetDialog } from "@/components/SheetDialog";
import { ToggleField } from "@/components/ToggleField";
import type { StationSettingsDraft } from "@/lib/drafts";
import { LANGS, lang, setLang, t } from "@/lib/i18n";
import { handleClearAllData } from "@/lib/store";
import { setTheme, THEMES, theme } from "@/lib/theme";
import { FieldInputSettings } from "./FieldInputSettings";

// Field toggles in broad → specific order (floor → rack number), matching the
// editor and details views. Labels resolve per-render from the string table.
const FIELD_TOGGLE_KEYS = ["floor", "lane", "distance", "side", "rackLevel", "rackNumber"] as const;

// Every control here applies immediately, like the theme and language
// switches: there is nothing to save and nothing to cancel.
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: JSX render fn; markup dominates the line count
export function StationSettingsSheet({
  stationForm,
  setStationForm,
  onClose,
}: {
  stationForm: StationSettingsDraft;
  setStationForm: Dispatch<SetStateAction<StationSettingsDraft>>;
  onClose: () => void;
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

  function updateFieldToggle(key: (typeof FIELD_TOGGLE_KEYS)[number], checked: boolean) {
    setStationForm((previous) => ({
      ...previous,
      enabledFields: { ...previous.enabledFields, [key]: checked },
    }));
  }

  return (
    <SheetDialog label={t.value.settings} title={t.value.settings} onClose={onClose}>
      <div className="settings-stack">
        <section className="settings-section" aria-label={t.value.station}>
          <label className="field">
            <span>{t.value.stationName}</span>
            <input
              aria-label={t.value.stationName}
              autoComplete="off"
              placeholder={t.value.stationNamePlaceholder}
              value={stationForm.name}
              onChange={(event) => updateStationField("name", event.currentTarget.value)}
            />
          </label>

          <fieldset className="settings-fieldset">
            <legend>{t.value.enabledFields}</legend>
            {FIELD_TOGGLE_KEYS.map((key) => (
              <Fragment key={key}>
                <ToggleField
                  checked={stationForm.enabledFields[key]}
                  label={t.value[key]}
                  onChange={(checked) => updateFieldToggle(key, checked)}
                />
                {key === "floor" && stationForm.enabledFields.floor ? (
                  <FieldInputSettings
                    field="floor"
                    noun={t.value.floor}
                    legend={t.value.floorInput}
                    mode={stationForm.floorInputMode}
                    labels={stationForm.floorLabels}
                    onModeChange={(mode) => updateStationField("floorInputMode", mode)}
                    onLabelsChange={(labels) => updateStationField("floorLabels", labels)}
                  />
                ) : null}
                {key === "lane" && stationForm.enabledFields.lane ? (
                  <FieldInputSettings
                    field="lane"
                    noun={t.value.lane}
                    legend={t.value.laneInput}
                    mode={stationForm.laneInputMode}
                    labels={stationForm.laneLabels}
                    onModeChange={(mode) => updateStationField("laneInputMode", mode)}
                    onLabelsChange={(labels) => updateStationField("laneLabels", labels)}
                  />
                ) : null}
              </Fragment>
            ))}
          </fieldset>
        </section>

        <hr className="settings-divider" />

        <section className="settings-section" aria-label={t.value.general}>
          <SegmentedControl
            label={t.value.language}
            options={LANGS}
            value={lang.value}
            onChange={setLang}
            titleCase={(option) => t.value.langOpts[option]}
          />
          <SegmentedControl
            label={t.value.theme}
            options={THEMES}
            value={theme.value}
            onChange={setTheme}
            titleCase={(option) => t.value.themeOpts[option]}
          />
          <button
            className="ghost-button ghost-button--wide ghost-button--danger"
            type="button"
            onClick={handleClearAllData}
          >
            {t.value.clearAllData}
          </button>
        </section>
      </div>
    </SheetDialog>
  );
}
