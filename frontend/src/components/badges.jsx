import { Badge } from './ui';
import { cn } from '../lib/cn';

const STATUS = {
  Open: { tone: 'outline', dot: 'bg-sky-500', label: 'Open' },
  'In Progress': { tone: 'ochre', dot: 'bg-ochre-500', label: 'In progress' },
  Resolved: { tone: 'leaf', dot: 'bg-leaf-500', label: 'Resolved' },
  Closed: { tone: 'neutral', dot: 'bg-ink-faint', label: 'Closed' },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.Open;
  return (
    <Badge tone={s.tone} dot={s.dot}>
      {s.label}
    </Badge>
  );
}

const PRIORITY = {
  Critical: 'bg-clay-600 text-white',
  High: 'bg-clay-50 text-clay-700',
  Medium: 'bg-ochre-50 text-ochre-700',
  Low: 'bg-ink/[0.05] text-ink-muted',
};

export function PriorityBadge({ priority, className }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium', PRIORITY[priority], className)}>
      {priority}
    </span>
  );
}

// Short labels keep dense tables readable; full names appear in tooltips.
const CATEGORY_SHORT = {
  'Royalty & Payments': 'Royalty',
  'ISBN & Metadata Issues': 'ISBN & Metadata',
  'Printing & Quality': 'Printing',
  'Distribution & Availability': 'Distribution',
  'Book Status & Production Updates': 'Production',
  'General Inquiry': 'General',
};

export function CategoryBadge({ category, short = false }) {
  return (
    <Badge tone="neutral" className="font-normal">
      <span title={category}>{short ? CATEGORY_SHORT[category] || category : category}</span>
    </Badge>
  );
}

export function BookStatusBadge({ status }) {
  const live = status === 'Published & Live';
  return (
    <Badge tone={live ? 'leaf' : 'ochre'} dot={live ? 'bg-leaf-500' : 'bg-ochre-500'}>
      {live ? 'Live' : status.replace(/^In Production - /, 'In production · ')}
    </Badge>
  );
}
