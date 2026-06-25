import { History } from 'lucide-preact';

import { SheetDialog } from '../../components/SheetDialog';
import type { LocationRecord } from '../../lib/app-data';
import { formatTimestamp, getSummary, showFloor } from '../location/display';

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
      label="Recent locations"
      title="Recent locations"
      titleIcon={<History aria-hidden="true" className="button-icon" />}
      onClose={onClose}
    >
      <div className="recent-list recent-list--sheet">
        {recent.map((entry) => {
          const title = getRecentTitle(entry);
          const meta = getRecentMeta(entry);

          return (
            <button
              aria-label={`Restore ${getRestoreLabel(entry)} from recent locations`}
              key={entry.id}
              className="recent-item"
              type="button"
              onClick={() => onPreview(entry.id)}
            >
              <div className="recent-item__body">
                <p className="recent-title">{title}</p>
                <p className="recent-meta">{meta}</p>
              </div>
              <span className="recent-time">{formatTimestamp(entry.updatedAt)}</span>
            </button>
          );
        })}
      </div>
    </SheetDialog>
  );
}

function getRestoreLabel(entry: LocationRecord) {
  if (entry.mode === 'outside') {
    return 'outside location';
  }

  return entry.lane ? `lane ${entry.lane}` : 'station spot';
}

function getRecentTitle(entry: LocationRecord) {
  if (entry.mode === 'outside') {
    return 'Outside the station';
  }

  const summary = getSummary(entry);

  if (!entry.lane) {
    return summary || 'Bike spot';
  }

  return `Lane ${entry.lane}${summary ? ` · ${summary}` : ''}`;
}

function getRecentMeta(entry: LocationRecord) {
  if (entry.mode === 'outside') {
    return entry.outsideDescription;
  }

  return [showFloor(entry) ? entry.floor : ''].filter(Boolean).join(' · ');
}
