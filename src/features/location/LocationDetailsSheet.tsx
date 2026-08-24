import { CheckCircle2 } from "lucide-preact";

import { SheetDialog } from "@/components/SheetDialog";
import type { LocationRecord } from "@/lib/app-data";
import { t } from "@/lib/i18n";
import { formatTimestamp, getPrimaryLabel } from "./display";
import { LocationDetailContent } from "./LocationDetailContent";

export function LocationDetailsSheet({
  current,
  onClose,
  onCollected,
}: {
  current: LocationRecord | null;
  onClose: () => void;
  onCollected: () => void;
}) {
  return (
    <SheetDialog
      label={t.value.locationDetails}
      title={current ? getPrimaryLabel(current) : t.value.locationDetails}
      onClose={onClose}
    >
      {current ? (
        <div className="preview-stack">
          <LocationDetailContent entry={current} photoAlt={t.value.savedBikeRef} />
          <p className="timestamp">{t.value.updated(formatTimestamp(current.updatedAt))}</p>
          {/* "I have my bike": the spot is done, but it stays in Recent. */}
          <button className="ghost-button ghost-button--wide" type="button" onClick={onCollected}>
            <CheckCircle2 aria-hidden="true" className="button-icon" />
            <span>{t.value.bikeCollected}</span>
          </button>
        </div>
      ) : null}
    </SheetDialog>
  );
}
