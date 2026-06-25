import { RotateCcw } from 'lucide-preact';

import { SheetDialog } from '@/components/SheetDialog';
import { formatTimestamp, getPrimaryLabel } from '@/features/location/display';
import { LocationDetailContent } from '@/features/location/LocationDetailContent';
import type { LocationRecord } from '@/lib/app-data';

export function RecentLocationPreviewSheet({
  selectedRecent,
  onClose,
  onUse,
}: {
  selectedRecent: LocationRecord;
  onClose: () => void;
  onUse: (id: string) => void;
}) {
  return (
    <SheetDialog
      label="Recent location preview"
      title={getPrimaryLabel(selectedRecent)}
      onClose={onClose}
    >
      <div className="preview-stack">
        <LocationDetailContent entry={selectedRecent} photoAlt="Recent bike reference" />
        <p className="timestamp">Saved {formatTimestamp(selectedRecent.updatedAt)}</p>
        <button
          className="primary-button primary-button--wide"
          type="button"
          onClick={() => onUse(selectedRecent.id)}
        >
          <RotateCcw aria-hidden="true" className="button-icon" />
          Use this location
        </button>
      </div>
    </SheetDialog>
  );
}
