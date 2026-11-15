import { useEffect, useRef, useState } from "preact/hooks";
import { t } from "@/lib/i18n";

// A destructive button that asks inside the sheet instead of opening a native
// dialog (unthemed, and a browser can suppress it). Focus lands on Cancel, the
// safe choice, and returns to the trigger when the user backs out.
export function ConfirmAction({ label, prompt, onConfirm }: { label: string; prompt: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);

  useEffect(() => {
    if (asking) {
      cancelRef.current?.focus();
    } else if (wasAsking.current) {
      triggerRef.current?.focus();
    }
    wasAsking.current = asking;
  }, [asking]);

  if (!asking) {
    return (
      <button
        ref={triggerRef}
        className="ghost-button ghost-button--wide ghost-button--danger"
        type="button"
        onClick={() => setAsking(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="confirm-action">
      <p className="confirm-action__prompt" role="alert">
        {prompt}
      </p>
      <div className="confirm-action__buttons">
        <button ref={cancelRef} className="ghost-button" type="button" onClick={() => setAsking(false)}>
          {t.value.cancel}
        </button>
        <button className="ghost-button ghost-button--danger" type="button" onClick={onConfirm}>
          {label}
        </button>
      </div>
    </div>
  );
}
