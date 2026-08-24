import { ChevronRight, MapPin, Pencil, Plus } from "lucide-preact";

import { usePhotoUrl } from "@/components/usePhotoUrl";
import type { LocationRecord } from "@/lib/app-data";
import { t } from "@/lib/i18n";
import { formatRelativeTimestamp, getDetailFacts, getPrimaryLabel, mapsLink } from "./display";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: JSX render fn; markup dominates the line count
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the branches are the card's empty/station/outside states
export function CurrentSpotCard({
  current,
  notice,
  onEdit,
  onOpenDetails,
}: {
  current: LocationRecord | null;
  notice: { text: string; tone?: "error" } | null;
  onEdit: () => void;
  onOpenDetails: () => void;
}) {
  const facts = current ? getDetailFacts(current) : [];
  const photoUrl = usePhotoUrl(current?.photoId);

  // The whole sign is a tap target for the details sheet, but its text stays
  // selectable: a click that ends a text selection is not a tap.
  function handleCardClick() {
    if (current && !window.getSelection()?.toString()) {
      onOpenDetails();
    }
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: the hit button below is the accessible control; the section click is the pointer convenience
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users reach the hit button directly
    <section
      className={current ? "current-card current-card--tappable" : "current-card"}
      aria-label={t.value.currentSpot}
      onClick={handleCardClick}
    >
      <div className="current-card__content">
        {current ? (
          <span className="current-card__topline-end">
            {current.coords ? (
              <MapPin aria-label={t.value.hasGps} className="button-icon current-card__pin" />
            ) : null}
            <ChevronRight aria-hidden="true" className="button-icon current-card__chevron" />
          </span>
        ) : null}
        <p className={notice?.tone === "error" ? "notice notice--error" : "notice"} role="status">
          {notice?.text}
        </p>
        <div className="current-card__header">
          <div className="current-card__lead">
            {photoUrl ? (
              <figure className="current-card__thumb">
                <img src={photoUrl} alt={t.value.currentBikeRef} />
              </figure>
            ) : null}
            <h1
              className={
                !current || current.mode === "outside" ? "headline headline--outside" : "headline"
              }
            >
              {current ? getPrimaryLabel(current) : t.value.noSpotYet}
            </h1>
          </div>
          <div className="current-card__body">
            {!current ? <p className="spot-summary">{t.value.emptyIntro}</p> : null}
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
              <p className="timestamp">
                {t.value.updated(formatRelativeTimestamp(current.updatedAt))}
              </p>
            ) : null}
            <div className="current-card__actions">
              {current?.coords ? (
                <a
                  className="ghost-button current-card__maps"
                  href={mapsLink(current.coords)}
                  rel="noopener noreferrer"
                  target="_blank"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MapPin aria-hidden="true" className="button-icon" />
                  <span>{t.value.openInMaps}</span>
                </a>
              ) : null}
              <button
                className="primary-button primary-button--hero current-card__action"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
              >
                {current ? (
                  <Pencil aria-hidden="true" className="button-icon" />
                ) : (
                  <Plus aria-hidden="true" className="button-icon" />
                )}
                {current ? t.value.changeLocation : t.value.saveSpot}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Keyboard / AT path to the details sheet; its click bubbles to the section. */}
      {current ? (
        <button aria-label={t.value.viewDetails} className="current-card__hit" type="button" />
      ) : null}
    </section>
  );
}
