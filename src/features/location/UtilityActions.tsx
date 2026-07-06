import { History, Settings2 } from "lucide-preact";

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
    <section className="utility-actions" aria-label="Quick actions">
      <button className="utility-button" type="button" onClick={onOpenRecent}>
        <span className="utility-button__row">
          <span className="utility-button__title">
            <History aria-hidden="true" className="button-icon" />
            <span>Recent locations</span>
          </span>
          <span className="utility-count">{recentCount}</span>
        </span>
      </button>
      <button className="utility-button" type="button" onClick={onOpenStationSettings}>
        <span className="utility-button__title">
          <Settings2 aria-hidden="true" className="button-icon" />
          <span>Settings</span>
        </span>
      </button>
    </section>
  );
}
