import { RotateCcw } from "lucide-preact";

import { SheetDialog } from "@/components/SheetDialog";
import { formatTimestamp, getPrimaryLabel } from "@/features/location/display";
import { LocationDetailContent } from "@/features/location/LocationDetailContent";
import type { LocationRecord } from "@/lib/app-data";
import { t } from "@/lib/i18n";

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
      closeLabel={t.value.backToRecent}
      label={t.value.recentPreview}
      title={getPrimaryLabel(selectedRecent)}
      onClose={onClose}
    >
      <div className="preview-stack">
        <LocationDetailContent entry={selectedRecent} photoAlt={t.value.recentBikeRef} />
        <p className="timestamp">{t.value.saved(formatTimestamp(selectedRecent.updatedAt))}</p>
        <button
          className="primary-button primary-button--wide"
          type="button"
          onClick={() => onUse(selectedRecent.id)}
        >
          <RotateCcw aria-hidden="true" className="button-icon" />
          {t.value.useThisLocation}
        </button>
      </div>
    </SheetDialog>
  );
}
