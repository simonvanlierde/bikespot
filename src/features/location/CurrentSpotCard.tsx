import { ChevronRight, Pencil } from 'lucide-preact';

import type { LocationRecord } from '@/lib/app-data';
import { formatTimestamp, getPrimaryLabel, getSummary, showFloor } from './display';

export function CurrentSpotCard({
  current,
  notice,
  onEdit,
  onOpenDetails,
}: {
  current: LocationRecord | null;
  notice: string;
  onEdit: () => void;
  onOpenDetails: () => void;
}) {
  const summary = getSummary(current);

  return (
    <section className="current-card current-card--tappable" aria-label="Current spot">
      <div className="current-card__content">
        <div className="current-card__topline">
          <p className="section-kicker">Current spot</p>
          <ChevronRight aria-hidden="true" className="button-icon current-card__chevron" />
        </div>
        {notice ? <p className="notice">{notice}</p> : null}
        <div className="current-card__header">
          <div className="current-card__body">
            <h1 className="headline">{getPrimaryLabel(current)}</h1>
            {summary ? <p className="spot-summary">{summary}</p> : null}
            {current?.mode === 'station' && showFloor(current) ? (
              <p className="spot-floor">Station floor {current.floor}</p>
            ) : null}
            <p className="timestamp">Updated {formatTimestamp(current?.updatedAt)}</p>
          </div>
          <div className="action-stack">
            <button className="primary-button primary-button--hero" type="button" onClick={onEdit}>
              <Pencil aria-hidden="true" className="button-icon" />
              Change location
            </button>
          </div>
        </div>
      </div>
      {/* Full-card hit target for opening details; sits behind the content so the
          action button above stays clickable. */}
      <button
        aria-label="View details"
        className="current-card__hit"
        type="button"
        onClick={onOpenDetails}
      />
    </section>
  );
}
