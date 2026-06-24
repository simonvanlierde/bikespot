import { MapPin } from 'lucide-preact';

import { DetailRow } from '../../components/DetailRow';
import { usePhotoUrl } from '../../components/usePhotoUrl';
import type { LocationRecord } from '../../lib/app-data';
import {
  formatAccuracy,
  getSummary,
  mapsLink,
  shouldShowEntryField,
  showFloor,
  titleCase,
} from './display';

export function LocationDetailContent({
  entry,
  photoAlt,
  draftPhotoFile,
}: {
  entry: LocationRecord;
  photoAlt: string;
  draftPhotoFile?: File | null;
}) {
  const photoUrl = usePhotoUrl(entry.photoId, draftPhotoFile);
  const stationDetails =
    entry.mode === 'station'
      ? [
          { label: 'Lane', value: entry.lane },
          {
            label: 'Side',
            value:
              shouldShowEntryField(entry, 'side') && entry.side ? titleCase(entry.side) : undefined,
          },
          {
            label: 'Rack level',
            value:
              shouldShowEntryField(entry, 'rackLevel') && entry.rackLevel
                ? titleCase(entry.rackLevel)
                : undefined,
          },
          {
            label: 'Distance',
            value:
              shouldShowEntryField(entry, 'distance') && entry.distance
                ? titleCase(entry.distance)
                : undefined,
          },
          { label: 'Station floor', value: showFloor(entry) ? entry.floor : undefined },
          {
            label: 'Rack number',
            value: shouldShowEntryField(entry, 'rackNumber') ? entry.rackNumber : undefined,
          },
        ]
      : [];

  return (
    <div className="preview-stack">
      {entry.mode === 'outside' ? (
        <p className="spot-summary">{entry.outsideDescription}</p>
      ) : (
        <>
          <p className="spot-summary">{getSummary(entry)}</p>
          {showFloor(entry) ? <p className="spot-floor">Station floor {entry.floor}</p> : null}
        </>
      )}

      <DetailRow label="Station" value={entry.stationName} />
      {stationDetails.map((detail) => (
        <DetailRow key={detail.label} label={detail.label} value={detail.value} />
      ))}

      {entry.mode === 'station' && entry.notes ? (
        <p className="detail-note">{entry.notes}</p>
      ) : null}

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
    </div>
  );
}
