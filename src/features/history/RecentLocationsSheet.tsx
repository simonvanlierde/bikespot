import { History, MapPin, Undo2 } from "lucide-preact";

import { SheetDialog } from "@/components/SheetDialog";
import { formatTimestamp, getDetailFacts, getPrimaryLabel } from "@/features/location/display";
import type { LocationRecord } from "@/lib/app-data";
import { t } from "@/lib/i18n";
import type { Notice } from "@/lib/store";

export function RecentLocationsSheet({
  recent,
  notice,
  onClose,
  onPreview,
}: {
  recent: LocationRecord[];
  notice?: Notice | null;
  onClose: () => void;
  onPreview: (id: string) => void;
}) {
  return (
    <SheetDialog
      label={t.value.recentLocations}
      title={t.value.recentLocations}
      titleIcon={<History aria-hidden="true" className="button-icon" />}
      onClose={onClose}
    >
      {/* The main card's status region announces the notice; this copy only
          puts Undo inside the sheet, where focus is trapped. */}
      {notice?.undo ? (
        <div className="notice-row notice-row--sheet">
          <p className="sheet-description">{notice.text}</p>
          <button
            className="ghost-button"
            type="button"
            onClick={(event) => {
              // Undo unmounts this button; keep focus in the sheet.
              const sheet = event.currentTarget.closest<HTMLElement>("[aria-modal]");
              notice.undo?.();
              sheet?.focus();
            }}
          >
            <Undo2 aria-hidden="true" className="button-icon" />
            {t.value.undo}
          </button>
        </div>
      ) : null}
      <div className="recent-list recent-list--sheet">
        {recent.length === 0 ? <p className="sheet-description">{t.value.noRecentYet}</p> : null}
        {recent.map((entry) => {
          const title = getPrimaryLabel(entry);
          const meta = getRecentMeta(entry);

          return (
            <button
              aria-label={t.value.viewRecent(title)}
              key={entry.id}
              className="recent-item"
              type="button"
              onClick={() => onPreview(entry.id)}
            >
              <span className="recent-item__body">
                <span className="recent-title">
                  {title}
                  {entry.coords ? (
                    <MapPin aria-label={t.value.hasGps} className="recent-title__pin" />
                  ) : null}
                </span>
                {meta ? <span className="recent-meta">{meta}</span> : null}
              </span>
              <span className="recent-time">{formatTimestamp(entry.updatedAt)}</span>
            </button>
          );
        })}
      </div>
    </SheetDialog>
  );
}

// Mirror the main card's priority: the headline is the primary locator, the
// meta line is the same labeled fact set (or the outside description).
function getRecentMeta(entry: LocationRecord) {
  if (entry.mode === "outside") {
    return entry.outsideDescription ?? "";
  }

  return getDetailFacts(entry).join(" · ");
}
