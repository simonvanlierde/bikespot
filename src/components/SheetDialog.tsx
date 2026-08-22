import { X } from "lucide-preact";
import type { ReactNode } from "preact/compat";
import { useEffect, useRef } from "preact/hooks";
import { t } from "@/lib/i18n";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: JSX render fn; markup dominates the line count
export function SheetDialog({
  children,
  label,
  title,
  titleIcon,
  onClose,
  closeLabel = t.value.close,
}: {
  children: ReactNode;
  label: string;
  title: ReactNode;
  titleIcon?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
}) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheetRef.current?.focus();

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: focus-trap Tab/Escape handling is irreducibly branchy
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      // aria-modal promises the background is inert, so keep Tab inside the
      // sheet: wrap at the edges and pull focus back if it escaped.
      if (event.key === "Tab") {
        const sheet = sheetRef.current;

        if (!sheet) {
          return;
        }

        const focusable = sheet.querySelectorAll<HTMLElement>(
          // biome-ignore lint/security/noSecrets: CSS focusable-elements selector, not a secret
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && (active === first || active === sheet)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        } else if (active instanceof HTMLElement && !sheet.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="sheet-overlay">
      {/* Backdrop hit target — a pointer convenience behind the sheet. Hidden
          from assistive tech; Escape and the close button are the a11y paths. */}
      <button
        aria-hidden="true"
        className="sheet-overlay__hit"
        tabIndex={-1}
        type="button"
        onClick={onClose}
      />
      <section
        ref={sheetRef}
        aria-label={label}
        aria-modal="true"
        className="editor-sheet"
        role="dialog"
        tabIndex={-1}
      >
        <div className="sheet-header">
          <h2 className="sheet-title">
            {titleIcon}
            <span>{title}</span>
          </h2>
          <button
            aria-label={closeLabel}
            className="ghost-button ghost-button--icon sheet-close"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="button-icon" />
            <span className="sr-only">{closeLabel}</span>
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
