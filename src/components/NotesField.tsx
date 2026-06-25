export function NotesField({
  value,
  onChange,
}: {
  value: string;
  onChange: (notes: string) => void;
}) {
  return (
    <label className="field">
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
