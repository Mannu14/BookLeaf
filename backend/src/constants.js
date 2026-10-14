// Domain enums shared by models, validators, AI output validation and the seed script.
// Keeping them in one place means a new category only has to be added here.

const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

// Numeric ranks let MongoDB sort the queue by urgency without loading everything into memory.
const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const STATUS_RANK = { Open: 0, 'In Progress': 1, Resolved: 2, Closed: 3 };

const ACTIVE_STATUSES = ['Open', 'In Progress'];

// Tickets older than this without resolution are flagged in the admin queue.
const SLA_HOURS = 48;

const ROLES = { AUTHOR: 'author', ADMIN: 'admin' };

module.exports = {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  PRIORITY_RANK,
  STATUS_RANK,
  ACTIVE_STATUSES,
  SLA_HOURS,
  ROLES,
};
