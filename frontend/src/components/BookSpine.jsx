import { cn } from '../lib/cn';

// A small generated "spine" gives each book a recognisable visual without cover art.
// Hue is derived from the title so it is stable across renders and pages.
export default function BookSpine({ title, live, size = 'md', className }) {
  const hue = [...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const sizes = { md: 'h-11 w-8 text-[11px]', lg: 'h-20 w-14 text-[18px]' };
  return (
    <span
      className={cn('relative flex shrink-0 items-end justify-center overflow-hidden rounded-[3px] pb-1 shadow-card', sizes[size], className)}
      style={{ background: live ? `hsl(${hue} 32% 34%)` : `hsl(${hue} 10% 80%)` }}
      aria-hidden="true"
    >
      <span className="absolute inset-y-0 left-[3px] w-px bg-white/25" />
      <span className="absolute inset-x-0 top-2 mx-auto h-px w-1/2 bg-white/25" />
      <span className="font-display text-white/90">{title[0]}</span>
    </span>
  );
}
