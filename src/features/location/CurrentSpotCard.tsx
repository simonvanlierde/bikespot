import { ChevronRight, MapPin, Pencil } from "lucide-preact";

import { usePhotoUrl } from "@/components/usePhotoUrl";
import type { LocationRecord } from "@/lib/app-data";
import { t } from "@/lib/i18n";
import { formatTimestamp, getDetailFacts, getPrimaryLabel } from "./display";

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
    <section className="current-card current-card--tappable" aria-label={t.value.currentSpot}>
      <div className="current-card__content">
        <div className="current-card__topline">
          <p className="section-kicker">{t.value.currentSpot}</p>
          <span className="current-card__topline-end">
            {current?.coords ? (
              <MapPin aria-label={t.value.hasGps} className="button-icon current-card__pin" />
            ) : null}
            <ChevronRight aria-hidden="true" className="button-icon current-card__chevron" />
          </span>
        </div>
        <p className="notice" role="status">
          {notice}
        </p>
        <div className="current-card__header">
          <div className="current-card__lead">
            {photoUrl ? (
              <figure className="current-card__thumb">
                <img src={photoUrl} alt={t.value.currentBikeRef} />
              </figure>
            ) : null}
            <h1 className={current?.mode === "outside" ? "headline headline--outside" : "headline"}>
              {getPrimaryLabel(current)}
            </h1>
          </div>
          <div className="current-card__body">
            {current?.mode === "outside" && current.outsideDescription ? (
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
              <p className="timestamp">{t.value.updated(formatTimestamp(current.updatedAt))}</p>
            ) : null}
            <button
              className="primary-button primary-button--hero current-card__action"
              type="button"
              onClick={onEdit}
            >
              <Pencil aria-hidden="true" className="button-icon" />
              {t.value.changeLocation}
            </button>
          </div>
        </div>
      </div>
      {/* Full-card hit target for opening details; sits behind the content so the
          action button above stays clickable. */}
      <button
        aria-label={t.value.viewDetails}
        className="current-card__hit"
        type="button"
        onClick={onOpenDetails}
      />
    </section>
  );
}
