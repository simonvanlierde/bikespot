import { t } from "@/lib/i18n";

export function NotesField({
  value,
  onChange,
}: {
  value: string;
  onChange: (notes: string) => void;
}) {
  return (
    <label className="field">
      <span>{t.value.notes}</span>
      <textarea
        aria-label={t.value.notes}
        rows={3}
        value={value}
        onInput={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}
