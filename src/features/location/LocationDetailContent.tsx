import { MapPin } from "lucide-preact";
import { DetailRow } from "@/components/DetailRow";
import { usePhotoUrl } from "@/components/usePhotoUrl";
import type { LocationRecord } from "@/lib/app-data";
import { t } from "@/lib/i18n";
import { formatAccuracy, getPrimaryFieldKey, mapsLink, shouldShowEntryField, showFloor } from "./display";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: conditional field rows are inherent to the detail view
export function LocationDetailContent({ entry, photoAlt }: { entry: LocationRecord; photoAlt: string }) {
  const photoUrl = usePhotoUrl(entry.photoId);
  // The sheet title already says the lane or rack, so its row is left out.
  const primary = getPrimaryFieldKey(entry);
  // Enabled fields in broad → specific order (floor → rack number), matching the
  // editor and settings views.
  const stationDetails =
    entry.mode === "station"
      ? [
          { label: t.value.stationFloor, value: showFloor(entry) ? entry.floor : undefined },
          { label: t.value.lane, value: primary === "lane" ? undefined : entry.lane },
          {
            label: t.value.distance,
            value: shouldShowEntryField(entry, "distance") && entry.distance ? t.value.opts[entry.distance] : undefined,
          },
          {
            label: t.value.side,
            value: shouldShowEntryField(entry, "side") && entry.side ? t.value.opts[entry.side] : undefined,
          },
          {
            label: t.value.rackLevel,
            value:
              shouldShowEntryField(entry, "rackLevel") && entry.rackLevel ? t.value.opts[entry.rackLevel] : undefined,
          },
          {
            label: t.value.rackNumber,
            value: primary !== "rackNumber" && shouldShowEntryField(entry, "rackNumber") ? entry.rackNumber : undefined,
          },
        ]
      : [];

  // No wrapper here: both callers already place this inside a .preview-stack, so
  // returning a fragment keeps the details on a single, even grid.
  return (
    <>
      {photoUrl ? (
        <figure className="photo-preview">
          <img src={photoUrl} alt={photoAlt} />
        </figure>
      ) : null}

      {entry.notes ? <p className="detail-note">{entry.notes}</p> : null}

      {stationDetails.some((detail) => detail.value) ? (
        <div className="detail-list">
          {stationDetails.map((detail) => (
            <DetailRow key={detail.label} label={detail.label} value={detail.value} />
          ))}
        </div>
      ) : null}

      {entry.coords ? (
        <a className="maps-link" href={mapsLink(entry.coords)} rel="noopener noreferrer" target="_blank">
          <MapPin aria-hidden="true" className="button-icon" />
          <span>{t.value.openInMaps}</span>
          <span className="sr-only">{t.value.opensInNewWindow}</span>
          {formatAccuracy(entry.coords) ? (
            <span className="maps-link__accuracy">{formatAccuracy(entry.coords)}</span>
          ) : null}
        </a>
      ) : null}
    </>
  );
}
