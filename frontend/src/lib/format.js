import { format, formatDistanceToNowStrict } from 'date-fns';

export const inr = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);

export const number = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));

export const date = (d) => (d ? format(new Date(d), 'd MMM yyyy') : '—');

export const dateTime = (d) => (d ? format(new Date(d), 'd MMM yyyy, h:mm a') : '—');

export const time = (d) => (d ? format(new Date(d), 'h:mm a') : '');

export const ago = (d) => (d ? `${formatDistanceToNowStrict(new Date(d))} ago` : '');

export const ageHours = (d) => (Date.now() - new Date(d).getTime()) / 36e5;

// "3h", "2d" – compact age for dense tables.
export const shortAge = (d) => {
  const h = ageHours(d);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
};

export const firstName = (name = '') => name.split(' ')[0];

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
