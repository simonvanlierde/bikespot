import { ImagePlus } from 'lucide-preact';

import type { ChangeEvent } from 'preact/compat';

export function PhotoField({
  onPhotoChange,
}: {
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
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
