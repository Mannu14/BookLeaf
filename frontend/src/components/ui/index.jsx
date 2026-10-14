import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';

export { default as Button } from './Button';
export { default as Modal } from './Modal';
export { Field, Input, Textarea, Select } from './Field';

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-[28px] leading-tight sm:text-[32px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ tone = 'neutral', className, children, dot }) {
  const tones = {
    neutral: 'bg-ink/[0.05] text-ink-soft',
    leaf: 'bg-leaf-50 text-leaf-700',
    ochre: 'bg-ochre-50 text-ochre-700',
    clay: 'bg-clay-50 text-clay-700',
    outline: 'border border-line-strong text-ink-soft',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium', tones[tone], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

export function Avatar({ name, size = 'md', tone = 'leaf', className }) {
  const sizes = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-[12px]', lg: 'h-11 w-11 text-[14px]' };
  const tones = { leaf: 'bg-leaf-100 text-leaf-800', ink: 'bg-ink text-paper', ochre: 'bg-ochre-100 text-ochre-700' };
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', sizes[size], tones[tone], className)}>
      {initials(name)}
    </span>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-paper ring-1 ring-line">
          <Icon className="h-5 w-5 text-ink-muted" />
        </div>
      )}
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone, className }) {
  const tones = { ochre: 'text-ochre-600', clay: 'text-clay-600', leaf: 'text-leaf-600' };
  return (
    <div className={cn('card p-5', className)}>
      <p className="eyebrow">{label}</p>
      <p className={cn('num mt-3 font-display text-[30px] leading-none', tones[tone])}>{value}</p>
      {hint && <p className="mt-2 text-[13px] text-ink-muted">{hint}</p>}
    </div>
  );
}

export function LiveDot({ active = true, className }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)}>
      {active && <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-leaf-400 opacity-60" />}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', active ? 'bg-leaf-500' : 'bg-ink-faint')} />
    </span>
  );
}

export function Tabs({ value, onChange, options, className }) {
  return (
    <div className={cn('inline-flex rounded-lg bg-ink/[0.04] p-0.5', className)} role="tablist">
      {options.map((opt) => {
        const { value: v, label, count } = typeof opt === 'string' ? { value: opt, label: opt } : opt;
        const active = v === value;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition',
              active ? 'bg-white text-ink shadow-card' : 'text-ink-muted hover:text-ink'
            )}
          >
            {label}
            {count != null && <span className={cn('num text-[11px]', active ? 'text-ink-muted' : 'text-ink-faint')}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
