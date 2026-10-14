import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function Modal({ open, onClose, title, description, children, footer, className }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus into the dialog for keyboard and screen-reader users.
    panel.current?.querySelector('input, textarea, select, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative flex max-h-[92vh] w-full animate-scale-in flex-col overflow-hidden rounded-t-2xl bg-white shadow-pop sm:max-w-lg sm:rounded-2xl',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 id="modal-title" className="font-display text-xl">
              {title}
            </h2>
            {description && <p className="mt-1 text-[13px] text-ink-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="-mr-1 rounded-md p-1 text-ink-muted transition hover:bg-paper hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-paper/60 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
