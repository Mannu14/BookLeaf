import React from 'react';

const STATUS_STYLES = {
  Open: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20',
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20',
  Closed: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-600/20',
};

const STATUS_DOTS = {
  Open: 'bg-blue-500',
  'In Progress': 'bg-amber-500 animate-pulse',
  Resolved: 'bg-emerald-500',
  Closed: 'bg-slate-400',
};

export default function StatusBadge({ status = 'Open', size = 'sm' }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Open;
  const dot = STATUS_DOTS[status] || STATUS_DOTS.Open;

  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm ${sizeClasses} ${style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

