import { SheetDialog } from "@/components/SheetDialog";
import type { LocationRecord } from "@/lib/app-data";
import { t } from "@/lib/i18n";
import { formatTimestamp } from "./display";
import { LocationDetailContent } from "./LocationDetailContent";

export function LocationDetailsSheet({
  current,
  onClose,
}: {
  current: LocationRecord | null;
  onClose: () => void;
}) {
  return (
    <SheetDialog
      closeLabel={t.value.closeDetails}
      label={t.value.locationDetails}
      title={t.value.locationDetails}
      onClose={onClose}
    >
      {current ? (
        <div className="preview-stack">
          <LocationDetailContent entry={current} photoAlt={t.value.savedBikeRef} />
          <p className="timestamp">{t.value.updated(formatTimestamp(current.updatedAt))}</p>
        </div>
      ) : null}
    </SheetDialog>
  );
}
