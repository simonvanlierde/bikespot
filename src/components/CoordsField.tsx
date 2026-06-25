import { LocateFixed } from 'lucide-preact';
import { formatAccuracy } from '@/features/location/display';
import type { Coords } from '@/lib/app-data';

export function CoordsField({
  coords,
  status,
  onCapture,
}: {
  coords: Coords | null;
  status: 'idle' | 'capturing' | 'error';
  onCapture: () => void;
}) {
  const capturing = status === 'capturing';

  return (
    <div className="field coords-field">
      <span>GPS location</span>
      <button
        className="ghost-button ghost-button--wide"
        disabled={capturing}
        type="button"
        onClick={onCapture}
      >
        <LocateFixed aria-hidden="true" className="button-icon" />
        <span>{capturing ? 'Locating…' : coords ? 'Update location' : 'Use my location'}</span>
      </button>

      {coords ? (
        <p className="coords-field__status">
          Captured{formatAccuracy(coords) ? ` · ${formatAccuracy(coords)} accuracy` : ''}
        </p>
      ) : null}

      {status === 'error' ? (
        <p className="coords-field__status coords-field__status--error">
          Couldn’t get your location. Check permissions and try again.
        </p>
      ) : null}
    </div>
  );
}
