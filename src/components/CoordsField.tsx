import { LocateFixed } from "lucide-preact";
import { formatAccuracy } from "@/features/location/display";
import type { Coords } from "@/lib/app-data";
import { t } from "@/lib/i18n";

export function CoordsField({
  coords,
  status,
  onCapture,
}: {
  coords: Coords | null;
  status: "idle" | "capturing" | "error";
  onCapture: () => void;
}) {
  const capturing = status === "capturing";

  return (
    <div className="field coords-field">
      <span>{t.value.gpsLocation}</span>
      <button
        className="ghost-button ghost-button--wide"
        disabled={capturing}
        type="button"
        onClick={onCapture}
      >
        <LocateFixed aria-hidden="true" className="button-icon" />
        <span>
          {capturing ? t.value.locating : coords ? t.value.updateLocation : t.value.useMyLocation}
        </span>
      </button>

      {/* Persistent live region: AT only announces changes inside an element
          that already existed, so the <p> stays mounted while empty. */}
      <p
        className={`coords-field__status${status === "error" ? " coords-field__status--error" : ""}`}
        role="status"
      >
        {status === "error"
          ? t.value.geoError
          : coords
            ? `${t.value.captured}${formatAccuracy(coords) ? ` · ${t.value.accuracy(formatAccuracy(coords))}` : ""}`
            : null}
      </p>
    </div>
  );
}
