import { cn } from '../lib/cn';

export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-leaf-700" />
      <path d="M9 22.5c0-8 5.5-13 14-13.5-.5 8.5-5.5 14-13.5 14" fill="none" stroke="#f7f5f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 22.5 17 15" stroke="#f7f5f0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ subtitle, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <div className="leading-tight">
        <p className="font-display text-[17px]">BookLeaf</p>
        {subtitle && <p className="text-[11px] text-ink-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
