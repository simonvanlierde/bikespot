import { History, MapPin } from "lucide-preact";

import { SheetDialog } from "@/components/SheetDialog";
import { formatTimestamp, getDetailFacts, getPrimaryLabel } from "@/features/location/display";
import type { LocationRecord } from "@/lib/app-data";
import { t } from "@/lib/i18n";

export function RecentLocationsSheet({
  recent,
  onClose,
  onPreview,
}: {
  recent: LocationRecord[];
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
      <div className="recent-list recent-list--sheet">
        {recent.map((entry) => {
          const title = getPrimaryLabel(entry);
          const meta = getRecentMeta(entry);

          return (
            <button
              aria-label={t.value.restore(title)}
              key={entry.id}
              className="recent-item"
              type="button"
              onClick={() => onPreview(entry.id)}
            >
              <div className="recent-item__body">
                <p className="recent-title">
                  {title}
                  {entry.coords ? (
                    <MapPin aria-label={t.value.hasGps} className="recent-title__pin" />
                  ) : null}
                </p>
                {meta ? <p className="recent-meta">{meta}</p> : null}
              </div>
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
