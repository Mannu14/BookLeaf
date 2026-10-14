// Deterministic facts computed from the database and handed to the model.
// The LLM is never asked to do date arithmetic or royalty maths: it gets the
// answers and is told to quote them, which removes a whole class of hallucination.

const PAYOUT_THRESHOLD = 1000;
const PAYOUT_WINDOW_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Last day of the quarter containing `date`.
function quarterEnd(date) {
  const d = new Date(date);
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3 + 3, 0);
}

function quarterLabel(date) {
  const d = new Date(date);
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
}

/**
 * Payout schedule relative to `now`:
 *  - the quarter whose payout window is currently open (previous quarter), and
 *  - the next quarter's payout deadline.
 */
function payoutSchedule(now = new Date()) {
  const prevQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
  const prevDeadline = new Date(prevQuarterEnd.getTime() + PAYOUT_WINDOW_DAYS * DAY_MS);
  const currentEnd = quarterEnd(now);
  const nextDeadline = new Date(currentEnd.getTime() + PAYOUT_WINDOW_DAYS * DAY_MS);

  // If the previous quarter's window is still open, that is the next payout.
  if (now <= prevDeadline) {
    return { quarter: quarterLabel(prevQuarterEnd), deadline: prevDeadline };
  }
  return { quarter: quarterLabel(currentEnd), deadline: nextDeadline };
}

/**
 * A payout is considered overdue when there is payable money (>= threshold) and
 * no payout has happened for longer than one full quarter plus the 45-day window.
 */
function isPayoutOverdue(book, now = new Date()) {
  if (!book || (book.royalty_pending || 0) < PAYOUT_THRESHOLD) return false;
  const reference = book.last_royalty_payout_date || book.publication_date;
  if (!reference) return false;
  const ageDays = (now - new Date(reference)) / DAY_MS;
  return ageDays > 92 + PAYOUT_WINDOW_DAYS;
}

function bookFacts(book, now = new Date()) {
  if (!book) return null;
  const inProduction = book.status !== 'Published & Live';
  const facts = {
    title: book.title,
    status: book.status,
    isbn: book.isbn || 'not yet assigned',
    genre: book.genre,
    publication_date: formatDate(book.publication_date) || 'not yet published',
    print_partner: book.print_partner || (inProduction ? 'not assigned yet' : 'In-House'),
    available_on: book.available_on?.length ? book.available_on.join(', ') : 'not listed yet',
  };

  if (!inProduction) {
    const pending = book.royalty_pending || 0;
    Object.assign(facts, {
      mrp: book.mrp != null ? formatINR(book.mrp) : 'n/a',
      royalty_per_copy: book.author_royalty_per_copy != null ? formatINR(book.author_royalty_per_copy) : 'n/a',
      copies_sold: book.total_copies_sold || 0,
      royalty_earned: formatINR(book.total_royalty_earned),
      royalty_paid: formatINR(book.royalty_paid),
      royalty_pending: formatINR(pending),
      last_payout: formatDate(book.last_royalty_payout_date) || 'no payout yet',
      pending_meets_threshold: pending >= PAYOUT_THRESHOLD,
      payout_overdue: isPayoutOverdue(book, now),
    });
  }
  return facts;
}

function renderFacts({ author, book, now = new Date() }) {
  const lines = [`Author first name: ${firstName(author?.name)}`, `Today: ${formatDate(now)}`];

  const schedule = payoutSchedule(now);
  lines.push(`Next scheduled royalty payout: ${schedule.quarter} royalties, paid by ${formatDate(schedule.deadline)}`);

  const facts = bookFacts(book, now);
  if (facts) {
    lines.push('Book:');
    for (const [k, v] of Object.entries(facts)) lines.push(`  ${k}: ${v}`);
  } else {
    lines.push('Book: none (general / account-level query)');
  }
  return lines.join('\n');
}

const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there';

module.exports = {
  PAYOUT_THRESHOLD,
  payoutSchedule,
  isPayoutOverdue,
  bookFacts,
  renderFacts,
  formatDate,
  formatINR,
  firstName,
};
