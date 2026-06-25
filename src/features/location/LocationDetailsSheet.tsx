import { CircleEllipsis } from 'lucide-preact';
import { SheetDialog } from '@/components/SheetDialog';
import type { LocationRecord } from '@/lib/app-data';
import { formatTimestamp } from './display';
import { LocationDetailContent } from './LocationDetailContent';

export function LocationDetailsSheet({
  current,
  onClose,
}: {
  current: LocationRecord | null;
  onClose: () => void;
}) {
  return (
    <SheetDialog
      closeLabel="Close details"
      label="Location details"
      title="Location details"
      titleIcon={<CircleEllipsis aria-hidden="true" className="button-icon" />}
      onClose={onClose}
    >
      {current ? (
        <div className="preview-stack">
          <LocationDetailContent entry={current} photoAlt="Saved bike reference" />
          <p className="timestamp">Updated {formatTimestamp(current.updatedAt)}</p>
        </div>
      ) : null}
    </SheetDialog>
  );
}
