import type { TargetedEvent } from 'preact';
import { NotesField } from '@/components/NotesField';
import { PhotoField } from '@/components/PhotoField';
import type { OutsideLocationDraft } from '@/lib/drafts';

export function OutsideLocationFields({
  formState,
  onNotesChange,
  onPhotoChange,
}: {
  formState: OutsideLocationDraft;
  onNotesChange: (notes: string) => void;
  onPhotoChange: (event: TargetedEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <NotesField value={formState.notes} onChange={onNotesChange} />
      <PhotoField onPhotoChange={onPhotoChange} />
    </>
  );
}
