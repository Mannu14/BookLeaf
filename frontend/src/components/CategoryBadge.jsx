import React from 'react';
import {
  DollarSign,
  Barcode,
  Printer,
  Globe,
  BookOpen,
  HelpCircle,
} from 'lucide-react';

const CATEGORY_CONFIG = {
  'Royalty & Payments': {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: DollarSign,
    iconColor: 'text-emerald-600',
  },
  'ISBN & Metadata Issues': {
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: Barcode,
    iconColor: 'text-indigo-600',
  },
  'Printing & Quality': {
    badge: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: Printer,
    iconColor: 'text-purple-600',
  },
  'Distribution & Availability': {
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: Globe,
    iconColor: 'text-sky-600',
  },
  'Book Status & Production Updates': {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: BookOpen,
    iconColor: 'text-amber-600',
  },
  'General Inquiry': {
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: HelpCircle,
    iconColor: 'text-slate-600',
  },
};

export default function CategoryBadge({ category = 'General Inquiry', showIcon = true, size = 'sm' }) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['General Inquiry'];
  const Icon = config.icon;
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm ${sizeClasses} ${config.badge}`}
    >
      {showIcon && <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />}
      <span>{category}</span>
    </span>
  );
}

