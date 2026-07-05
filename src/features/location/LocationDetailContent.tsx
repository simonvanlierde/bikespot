import { MapPin } from "lucide-preact";
import { DetailRow } from "@/components/DetailRow";
import { usePhotoUrl } from "@/components/usePhotoUrl";
import type { LocationRecord } from "@/lib/app-data";
import { formatAccuracy, mapsLink, shouldShowEntryField, showFloor, titleCase } from "./display";

export function LocationDetailContent({
  entry,
  photoAlt,
}: {
  entry: LocationRecord;
  photoAlt: string;
}) {
  const photoUrl = usePhotoUrl(entry.photoId);
  // Enabled fields in broad → specific order (floor → rack number), matching the
  // editor and settings views.
  const stationDetails =
    entry.mode === "station"
      ? [
          { label: "Station floor", value: showFloor(entry) ? entry.floor : undefined },
          { label: "Lane", value: entry.lane },
          {
            label: "Distance",
            value:
              shouldShowEntryField(entry, "distance") && entry.distance
                ? titleCase(entry.distance)
                : undefined,
          },
          {
            label: "Side",
            value:
              shouldShowEntryField(entry, "side") && entry.side ? titleCase(entry.side) : undefined,
          },
          {
            label: "Rack level",
            value:
              shouldShowEntryField(entry, "rackLevel") && entry.rackLevel
                ? titleCase(entry.rackLevel)
                : undefined,
          },
          {
            label: "Rack number",
            value: shouldShowEntryField(entry, "rackNumber") ? entry.rackNumber : undefined,
          },
        ]
      : [];

  // Outside spots keep their free text in outsideDescription; station spots in
  // notes. Both are the same "notes" to the reader, so render them the same way.
  const noteText = entry.mode === "station" ? entry.notes : entry.outsideDescription;

  // No wrapper here: both callers already place this inside a .preview-stack, so
  // returning a fragment keeps the details on a single, even grid.
  return (
    <>
      {stationDetails.some((detail) => detail.value) ? (
        <div className="detail-list">
          {stationDetails.map((detail) => (
            <DetailRow key={detail.label} label={detail.label} value={detail.value} />
          ))}
        </div>
      ) : null}

      {noteText ? <p className="detail-note">{noteText}</p> : null}

      {entry.coords ? (
        <a
          className="maps-link"
          href={mapsLink(entry.coords)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <MapPin aria-hidden="true" className="button-icon" />
          <span>Open in Maps</span>
          {formatAccuracy(entry.coords) ? (
            <span className="maps-link__accuracy">{formatAccuracy(entry.coords)}</span>
          ) : null}
        </a>
      ) : null}

      {photoUrl ? (
        <figure className="photo-preview">
          <img src={photoUrl} alt={photoAlt} />
        </figure>
      ) : null}
    </>
  );
}
