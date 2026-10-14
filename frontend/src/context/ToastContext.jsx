import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/cn';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const TONES = {
  success: 'text-leaf-600',
  error: 'text-clay-600',
  info: 'text-ink-muted',
};

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, title, description) => {
      const id = nextId++;
      setToasts((t) => [...t.slice(-3), { id, type, title, description }]);
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (title, description) => push('success', title, description),
      error: (title, description) => push('error', title, description),
      info: (title, description) => push('info', title, description),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className="pointer-events-auto flex animate-slide-in items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-pop">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONES[t.type])} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-ink-muted">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-ink-faint transition hover:text-ink" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
