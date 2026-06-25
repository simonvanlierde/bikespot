import { ImagePlus } from 'lucide-preact';

import type { TargetedEvent } from 'preact';

export function PhotoField({
  onPhotoChange,
}: {
  onPhotoChange: (event: TargetedEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="field">
      <span>Photo</span>
      <span className="file-trigger">
        <ImagePlus aria-hidden="true" className="button-icon" />
        <span>Add a photo</span>
        <input
          accept="image/*"
          aria-label="Photo"
          className="sr-only"
          onChange={onPhotoChange}
          type="file"
        />
      </span>
    </label>
  );
}
