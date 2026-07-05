import { ChevronRight, MapPin, Pencil } from 'lucide-preact';

import { usePhotoUrl } from '@/components/usePhotoUrl';
import type { LocationRecord } from '@/lib/app-data';
import { formatTimestamp, getDetailFacts, getPrimaryLabel } from './display';

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
  const facts = current ? getDetailFacts(current) : [];
  const photoUrl = usePhotoUrl(current?.photoId);

  return (
    <section className="current-card current-card--tappable" aria-label="Current spot">
      <div className="current-card__content">
        <div className="current-card__topline">
          <p className="section-kicker">Current spot</p>
          <span className="current-card__topline-end">
            {current?.coords ? (
              <MapPin aria-label="Has GPS location" className="button-icon current-card__pin" />
            ) : null}
            <ChevronRight aria-hidden="true" className="button-icon current-card__chevron" />
          </span>
        </div>
        {notice ? <p className="notice">{notice}</p> : null}
        <div className="current-card__header">
          <div className="current-card__lead">
            {photoUrl ? (
              <figure className="current-card__thumb">
                <img src={photoUrl} alt="Current bike reference" />
              </figure>
            ) : null}
            <h1 className={current?.mode === 'outside' ? 'headline headline--outside' : 'headline'}>
              {getPrimaryLabel(current)}
            </h1>
          </div>
          <div className="current-card__body">
            {current?.mode === 'outside' && current.outsideDescription ? (
              <p className="spot-summary">{current.outsideDescription}</p>
            ) : null}
            {facts.length ? (
              <p className="spot-facts">
                {facts.map((fact) => (
                  <span className="spot-fact" key={fact}>
                    {fact}
                  </span>
                ))}
              </p>
            ) : null}
            {current?.notes?.trim() ? <p className="spot-note">{current.notes}</p> : null}
          </div>
          <div className="current-card__footer">
            {current ? (
              <p className="timestamp">Updated {formatTimestamp(current.updatedAt)}</p>
            ) : null}
            <button
              className="primary-button primary-button--hero current-card__action"
              type="button"
              onClick={onEdit}
            >
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
