import React from 'react';
import { AlertCircle, AlertTriangle, Info, ArrowDown } from 'lucide-react';

const PRIORITY_CONFIG = {
  Critical: {
    badge: 'bg-red-50 text-red-700 border-red-300 ring-red-600/20',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    dot: 'bg-red-500 animate-ping',
  },
  High: {
    badge: 'bg-orange-50 text-orange-700 border-orange-300 ring-orange-600/20',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    dot: 'bg-orange-500',
  },
  Medium: {
    badge: 'bg-yellow-50 text-yellow-800 border-yellow-300 ring-yellow-600/20',
    icon: Info,
    iconColor: 'text-yellow-600',
    dot: 'bg-yellow-500',
  },
  Low: {
    badge: 'bg-slate-100 text-slate-700 border-slate-300 ring-slate-600/20',
    icon: ArrowDown,
    iconColor: 'text-slate-500',
    dot: 'bg-slate-400',
  },
};

export default function PriorityBadge({ priority = 'Medium', showIcon = true, size = 'sm' }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.Medium;
  const Icon = config.icon;
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border shadow-sm ${sizeClasses} ${config.badge}`}
    >
      {showIcon && <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />}
      <span>{priority}</span>
    </span>
  );
}
