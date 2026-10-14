import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Field({ label, hint, error, htmlFor, children, className, aside }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
            {label}
          </label>
          {aside}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-[12px] text-clay-600">{error}</p>
      ) : (
        hint && <p className="text-[12px] text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return <input ref={ref} className={cn('input h-10', invalid && 'input-invalid', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, invalid, ...props }, ref) {
  return <textarea ref={ref} className={cn('input resize-y py-2.5 leading-relaxed', invalid && 'input-invalid', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, size = 'md', ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn('input appearance-none pr-8', size === 'sm' ? 'h-8 py-0 text-[13px]' : 'h-10', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
    </div>
  );
});
