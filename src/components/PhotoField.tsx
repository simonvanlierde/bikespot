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
      <div className="file-input-wrap">
        <ImagePlus aria-hidden="true" className="button-icon" />
        <input accept="image/*" aria-label="Photo" onChange={onPhotoChange} type="file" />
      </div>
    </label>
  );
}
