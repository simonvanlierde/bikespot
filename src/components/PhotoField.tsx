import { Camera, ImagePlus, Trash2 } from "lucide-preact";

import type { TargetedEvent } from "preact";

import { t } from "@/lib/i18n";
import { usePhotoUrl } from "./usePhotoUrl";

export function PhotoField({
  photoFile,
  metadataKept,
  onPhotoChange,
  onPhotoRemove,
}: {
  photoFile: File | null;
  metadataKept: boolean;
  onPhotoChange: (event: TargetedEvent<HTMLInputElement>) => void;
  onPhotoRemove: () => void;
}) {
  const photoUrl = usePhotoUrl(undefined, photoFile);

  return (
    <div className="field">
      <span>{t.value.photo}</span>
      {photoUrl ? (
        <figure className="photo-preview photo-preview--editor">
          <img src={photoUrl} alt={t.value.photoPreviewAlt} />
        </figure>
      ) : null}
      <p className="field-hint" role="status">
        {metadataKept ? t.value.photoMetadataKept : ""}
      </p>
      <div className="photo-field__actions">
        {/* Chrome on Android opens its photo picker, which has no camera, for an input without
            `capture`. Shown only on touch screens; desktops ignore `capture`. */}
        <label className="file-trigger file-trigger--camera">
          <Camera aria-hidden="true" className="button-icon" />
          <span>{t.value.takePhoto}</span>
          <input
            accept="image/*"
            aria-label={t.value.takePhoto}
            capture="environment"
            className="sr-only"
            onChange={onPhotoChange}
            type="file"
          />
        </label>
        <label className="file-trigger">
          <ImagePlus aria-hidden="true" className="button-icon" />
          <span>{photoUrl ? t.value.replacePhoto : t.value.addPhoto}</span>
          <input accept="image/*" aria-label={t.value.photo} className="sr-only" onChange={onPhotoChange} type="file" />
        </label>
        {photoUrl ? (
          <button className="ghost-button" type="button" onClick={onPhotoRemove}>
            <Trash2 aria-hidden="true" className="button-icon" />
            <span>{t.value.removePhoto}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
