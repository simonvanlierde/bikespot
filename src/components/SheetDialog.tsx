import { X } from 'lucide-preact';
import type { ReactNode } from 'preact/compat';
import { useEffect, useRef } from 'preact/hooks';

export function SheetDialog({
  children,
  label,
  title,
  titleIcon,
  onClose,
  closeLabel = 'Close',
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
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
            className="ghost-button ghost-button--icon sheet-close sheet-close--compact"
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
