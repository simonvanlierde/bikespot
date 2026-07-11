import { History, Settings2 } from "lucide-preact";

import { t } from "@/lib/i18n";

export function UtilityActions({
  recentCount,
  onOpenRecent,
  onOpenStationSettings,
}: {
  recentCount: number;
  onOpenRecent: () => void;
  onOpenStationSettings: () => void;
}) {
  return (
    <section className="utility-actions" aria-label={t.value.quickActions}>
      <button className="utility-button" type="button" onClick={onOpenRecent}>
        <span className="utility-button__row">
          <span className="utility-button__title">
            <History aria-hidden="true" className="button-icon" />
            <span>{t.value.recentLocations}</span>
          </span>
          <span className="utility-count">{recentCount}</span>
        </span>
      </button>
      <button className="utility-button" type="button" onClick={onOpenStationSettings}>
        <span className="utility-button__title">
          <Settings2 aria-hidden="true" className="button-icon" />
          <span>{t.value.settings}</span>
        </span>
      </button>
    </section>
  );
}
