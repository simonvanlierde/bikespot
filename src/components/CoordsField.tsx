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

      {coords ? (
        <p className="coords-field__status">
          {t.value.captured}
          {formatAccuracy(coords) ? ` · ${t.value.accuracy(formatAccuracy(coords))}` : ""}
        </p>
      ) : null}

      {status === "error" ? (
        <p className="coords-field__status coords-field__status--error">{t.value.geoError}</p>
      ) : null}
    </div>
  );
}
