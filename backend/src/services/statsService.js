const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const User = require('../models/User');
const Book = require('../models/Book');
const { ACTIVE_STATUSES, SLA_HOURS, ROLES } = require('../constants');

const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id ?? 'unknown', r.count]));

async function dashboardStats() {
  const slaCutoff = new Date(Date.now() - SLA_HOURS * 60 * 60 * 1000);

  const [byStatus, byCategory, byPriorityActive, slaBreached, triageSources, overrides, draftUsage, responseTime] =
    await Promise.all([
      Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Ticket.aggregate([
        { $match: { status: { $in: ACTIVE_STATUSES } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Ticket.countDocuments({ status: { $in: ACTIVE_STATUSES }, created_at: { $lt: slaCutoff } }),
      Ticket.aggregate([{ $group: { _id: '$ai_triage_meta.source', count: { $sum: 1 } } }]),
      Ticket.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            category: { $sum: { $cond: ['$ai_category.overridden', 1, 0] } },
            priority: { $sum: { $cond: ['$ai_priority.overridden', 1, 0] } },
          },
        },
      ]),
      Message.aggregate([
        { $match: { sender_role: ROLES.ADMIN } },
        {
          $group: {
            _id: null,
            replies: { $sum: 1 },
            ai_assisted: { $sum: { $cond: ['$ai_assisted', 1, 0] } },
            sent_unedited: { $sum: { $cond: [{ $eq: ['$ai_draft_edited', false] }, 1, 0] } },
          },
        },
      ]),
      Ticket.aggregate([
        { $match: { first_response_at: { $ne: null } } },
        { $group: { _id: null, avg_ms: { $avg: { $subtract: ['$first_response_at', '$created_at'] } } } },
      ]),
    ]);

  const status = toMap(byStatus);
  const o = overrides[0] || { total: 0, category: 0, priority: 0 };
  const d = draftUsage[0] || { replies: 0, ai_assisted: 0, sent_unedited: 0 };

  return {
    tickets: {
      total: o.total,
      open: status.Open || 0,
      in_progress: status['In Progress'] || 0,
      resolved: status.Resolved || 0,
      closed: status.Closed || 0,
      sla_breached: slaBreached,
      active_by_priority: toMap(byPriorityActive),
      by_category: byCategory.map((r) => ({ category: r._id, count: r.count })),
      avg_first_response_hours: responseTime[0] ? +(responseTime[0].avg_ms / 3600000).toFixed(1) : null,
    },
    ai: {
      triage_sources: toMap(triageSources),
      // Share of AI suggestions an admin disagreed with: a live accuracy signal.
      category_override_rate: o.total ? +(o.category / o.total).toFixed(2) : 0,
      priority_override_rate: o.total ? +(o.priority / o.total).toFixed(2) : 0,
      replies: d.replies,
      ai_assisted_replies: d.ai_assisted,
      drafts_sent_unedited: d.sent_unedited,
    },
  };
}

async function authorDirectory() {
  const [authors, bookTotals, ticketTotals] = await Promise.all([
    User.find({ role: ROLES.AUTHOR }).sort({ name: 1 }),
    Book.aggregate([
      {
        $group: {
          _id: '$author_id',
          books: { $sum: 1 },
          copies_sold: { $sum: '$total_copies_sold' },
          royalty_earned: { $sum: '$total_royalty_earned' },
          royalty_pending: { $sum: '$royalty_pending' },
        },
      },
    ]),
    Ticket.aggregate([
      {
        $group: {
          _id: '$author_id',
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $in: ['$status', ACTIVE_STATUSES] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const books = Object.fromEntries(bookTotals.map((b) => [b._id, b]));
  const tickets = Object.fromEntries(ticketTotals.map((t) => [t._id, t]));

  return authors.map((a) => ({
    ...a.toPublicJSON(),
    books: books[a.author_id]?.books || 0,
    copies_sold: books[a.author_id]?.copies_sold || 0,
    royalty_earned: books[a.author_id]?.royalty_earned || 0,
    royalty_pending: books[a.author_id]?.royalty_pending || 0,
    tickets_total: tickets[a.author_id]?.total || 0,
    tickets_active: tickets[a.author_id]?.active || 0,
  }));
}

module.exports = { dashboardStats, authorDirectory };
