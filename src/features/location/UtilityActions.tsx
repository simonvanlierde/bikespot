import { History, Map as MapIcon, Settings2 } from "lucide-preact";

import { t } from "@/lib/i18n";

export function UtilityActions({
  recentCount,
  onOpenRecent,
  onOpenStationSettings,
  onOpenMap,
}: {
  recentCount: number;
  onOpenRecent: () => void;
  onOpenStationSettings: () => void;
  onOpenMap: () => void;
}) {
  return (
    <nav className="utility-actions" aria-label={t.value.navigation}>
      <button className="utility-button" type="button" onClick={onOpenRecent}>
        <span className="utility-button__row">
          <span className="utility-button__title">
            <History aria-hidden="true" className="button-icon" />
            <span>{t.value.recentLocations}</span>
          </span>
          <span className="utility-count">{recentCount}</span>
        </span>
      </button>
      <button className="utility-button" type="button" onClick={onOpenMap}>
        <span className="utility-button__title">
          <MapIcon aria-hidden="true" className="button-icon" />
          <span>{t.value.spotMap}</span>
        </span>
      </button>
      <button className="utility-button" type="button" onClick={onOpenStationSettings}>
        <span className="utility-button__title">
          <Settings2 aria-hidden="true" className="button-icon" />
          <span>{t.value.settings}</span>
        </span>
      </button>
    </nav>
  );
}
