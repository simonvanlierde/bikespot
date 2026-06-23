export function NotesField({
  value,
  prominent = false,
  onChange,
}: {
  value: string;
  prominent?: boolean;
  onChange: (notes: string) => void;
}) {
  return (
    <label className={prominent ? 'field field--prominent' : 'field'}>
      <span>Notes</span>
      <textarea
        aria-label="Notes"
        rows={3}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}
