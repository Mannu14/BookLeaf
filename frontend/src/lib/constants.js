export const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export const ACTIVE_STATUSES = ['Open', 'In Progress'];

export const SLA_HOURS = 48;

export const PRODUCTION_STAGES = [
  'Manuscript Received',
  'Editing',
  'Cover Design',
  'Typesetting',
  'Proofreading',
  'ISBN Assignment',
  'Printing',
  'Distribution Setup',
  'Published & Live',
];

export const PAYOUT_THRESHOLD = 1000;

// Mirrors the backend's payout calendar: royalties are paid within 45 days of
// each quarter ending.
export function nextPayout(now = new Date()) {
  const prevQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
  const prevDeadline = new Date(prevQuarterEnd.getTime() + 45 * 864e5);
  if (now <= prevDeadline) {
    return { quarter: `Q${Math.floor(prevQuarterEnd.getMonth() / 3) + 1} ${prevQuarterEnd.getFullYear()}`, deadline: prevDeadline };
  }
  const end = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
  return { quarter: `Q${Math.floor(end.getMonth() / 3) + 1} ${end.getFullYear()}`, deadline: new Date(end.getTime() + 45 * 864e5) };
}
