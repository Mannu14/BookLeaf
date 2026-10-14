const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const InternalNote = require('../models/InternalNote');
const Book = require('../models/Book');
const User = require('../models/User');
const Counter = require('../models/Counter');
const { aiService } = require('../ai/aiService');
const { events } = require('../realtime/socket');
const { notFound, forbidden, badRequest, escapeRegex } = require('../utils/http');
const { ROLES } = require('../constants');

const nextTicketNumber = async () => `BL-${await Counter.next('ticket')}`;

async function findTicketOr404(id) {
  const ticket = await Ticket.findById(id);
  if (!ticket) throw notFound('Ticket');
  return ticket;
}

function assertCanAccess(user, ticket) {
  if (user.role !== ROLES.ADMIN && ticket.author_id !== user.author_id) {
    throw forbidden('You can only access your own tickets.');
  }
}

/**
 * Author raises a ticket. Triage (category + priority) runs synchronously in a
 * single AI call so the admin queue is correctly ordered from the first second.
 * The reply draft is NOT generated here: it is produced on demand when an
 * admin opens the ticket, so we never pay for drafts nobody reads.
 */
async function createTicket(user, { book_id, subject, description, attachment }) {
  let book = null;
  if (book_id && book_id !== 'general') {
    book = await Book.findOne({ _id: book_id, author_id: user.author_id });
    if (!book) throw badRequest('Selected book does not belong to your account.');
  }

  const triage = await aiService.triage({ subject, description, book });

  const ticket = await Ticket.create({
    ticket_number: await nextTicketNumber(),
    author: user._id,
    author_id: user.author_id,
    author_name: user.name,
    author_email: user.email,
    book: book?._id || null,
    book_id: book?.book_id || null,
    book_title: book?.title || 'General / Account Level',
    subject,
    description,
    category: triage.category.value,
    priority: triage.priority.value,
    ai_category: triage.category,
    ai_priority: triage.priority,
    ai_triage_meta: triage.meta,
    attachment: attachment || null,
  });

  await Message.create({
    ticket: ticket._id,
    sender: user._id,
    sender_name: user.name,
    sender_role: ROLES.AUTHOR,
    body: description,
  });

  events.ticketCreated(ticket);
  return ticket;
}

async function listAuthorTickets(user, { status } = {}) {
  const filter = { author_id: user.author_id };
  if (status) filter.status = status;
  return Ticket.find(filter).sort({ last_activity_at: -1 });
}

async function getAuthorTicket(user, id) {
  const ticket = await findTicketOr404(id);
  assertCanAccess(user, ticket);

  if (ticket.unread_for_author && user.role === ROLES.AUTHOR) {
    ticket.unread_for_author = false;
    await ticket.save();
  }

  const messages = await Message.find({ ticket: ticket._id }).sort({ created_at: 1 });
  return { ticket, messages };
}

async function addAuthorMessage(user, id, body) {
  const ticket = await findTicketOr404(id);
  assertCanAccess(user, ticket);
  if (ticket.status === 'Closed') throw badRequest('This ticket is closed. Please raise a new ticket.');

  const message = await Message.create({
    ticket: ticket._id,
    sender: user._id,
    sender_name: user.name,
    sender_role: ROLES.AUTHOR,
    body,
  });

  // A follow-up on a resolved ticket means it is not resolved after all.
  if (ticket.status === 'Resolved') {
    ticket.status = 'In Progress';
    ticket.resolved_at = null;
  }
  ticket.last_activity_at = new Date();
  if (ticket.ai_draft?.text) ticket.ai_draft.stale = true;
  await ticket.save();

  events.messageCreated(ticket, message);
  events.ticketUpdated(ticket);
  return message;
}

// ---- Admin --------------------------------------------------------------

const SORTS = {
  urgency: { status_rank: 1, priority_rank: 1, created_at: 1 },
  newest: { created_at: -1 },
  oldest: { created_at: 1 },
};

async function listTickets(admin, q) {
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.category) filter.category = q.category;
  if (q.priority) filter.priority = q.priority;
  if (q.assignee === 'me') filter.assigned_to = admin._id;
  if (q.assignee === 'unassigned') filter.assigned_to = null;
  if (q.from || q.to) {
    filter.created_at = {};
    if (q.from) filter.created_at.$gte = new Date(q.from);
    if (q.to) {
      const end = new Date(q.to);
      end.setHours(23, 59, 59, 999);
      filter.created_at.$lte = end;
    }
  }
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = ['subject', 'author_name', 'author_email', 'ticket_number', 'book_title'].map((f) => ({ [f]: rx }));
  }

  const page = q.page || 1;
  const limit = q.limit || 50;
  const [items, total] = await Promise.all([
    Ticket.find(filter)
      .sort(SORTS[q.sort] || SORTS.urgency)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-ai_draft -description'),
    Ticket.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

async function getAdminTicket(id) {
  const ticket = await Ticket.findById(id).populate('book');
  if (!ticket) throw notFound('Ticket');

  const [messages, notes, authorBooks, author] = await Promise.all([
    Message.find({ ticket: ticket._id }).sort({ created_at: 1 }),
    InternalNote.find({ ticket: ticket._id }).sort({ created_at: 1 }),
    Book.find({ author_id: ticket.author_id }).sort({ publication_date: -1 }),
    User.findById(ticket.author),
  ]);

  const sum = (key) => authorBooks.reduce((s, b) => s + (b[key] || 0), 0);
  const authorContext = {
    author: author?.toPublicJSON() || null,
    totals: {
      books: authorBooks.length,
      copies_sold: sum('total_copies_sold'),
      royalty_earned: sum('total_royalty_earned'),
      royalty_paid: sum('royalty_paid'),
      royalty_pending: sum('royalty_pending'),
    },
    books: authorBooks.map((b) => ({
      _id: b._id,
      book_id: b.book_id,
      title: b.title,
      status: b.status,
      royalty_pending: b.royalty_pending,
      last_royalty_payout_date: b.last_royalty_payout_date,
    })),
    open_tickets: await Ticket.countDocuments({ author_id: ticket.author_id, status: { $in: ['Open', 'In Progress'] } }),
  };

  return { ticket, messages, notes, authorContext };
}

// In-flight draft generations, so double clicks / two admins opening the same
// ticket do not trigger two paid model calls.
const pendingDrafts = new Map();

async function generateDraft(id) {
  const key = String(id);
  if (pendingDrafts.has(key)) return pendingDrafts.get(key);

  const job = (async () => {
    const ticket = await Ticket.findById(id).populate('book');
    if (!ticket) throw notFound('Ticket');
    const [author, messages] = await Promise.all([
      User.findById(ticket.author),
      Message.find({ ticket: ticket._id }).sort({ created_at: 1 }),
    ]);

    const result = await aiService.draftReply({
      ticket,
      author: author || { name: ticket.author_name },
      book: ticket.book,
      messages,
    });

    ticket.ai_draft = { text: result.text, generated_at: new Date(), stale: false, kb_sections: result.kb_sections, meta: result.meta };
    await ticket.save();
    events.draftReady(ticket);
    return ticket.ai_draft;
  })();

  pendingDrafts.set(key, job);
  try {
    return await job;
  } finally {
    pendingDrafts.delete(key);
  }
}

async function updateTicket(admin, id, changes) {
  const ticket = await findTicketOr404(id);
  const now = new Date();

  if (changes.status && changes.status !== ticket.status) {
    ticket.status = changes.status;
    ticket.resolved_at = ['Resolved', 'Closed'].includes(changes.status) ? now : null;
  }

  // Overrides keep the original AI suggestion so we can measure accuracy.
  for (const field of ['category', 'priority']) {
    if (changes[field] && changes[field] !== ticket[field]) {
      ticket[field] = changes[field];
      const aiKey = `ai_${field}`;
      if (!ticket[aiKey]) ticket[aiKey] = {};
      const overridden = changes[field] !== ticket[aiKey].value;
      ticket[aiKey].overridden = overridden;
      ticket[aiKey].overridden_by = overridden ? admin.name : undefined;
      ticket[aiKey].overridden_at = overridden ? now : undefined;
    }
  }

  if (changes.assignee !== undefined) {
    if (changes.assignee === null) {
      ticket.assigned_to = null;
      ticket.assigned_to_name = null;
    } else {
      const assignee = changes.assignee === 'me' ? admin : await User.findOne({ _id: changes.assignee, role: ROLES.ADMIN });
      if (!assignee) throw badRequest('Assignee must be an admin user.');
      ticket.assigned_to = assignee._id;
      ticket.assigned_to_name = assignee.name;
    }
  }

  ticket.last_activity_at = now;
  await ticket.save();
  events.ticketUpdated(ticket);
  return ticket;
}

async function sendReply(admin, id, { body, resolve, from_draft }) {
  const ticket = await findTicketOr404(id);
  if (ticket.status === 'Closed') throw badRequest('Reopen the ticket before replying.');

  const draftText = ticket.ai_draft?.text?.trim();
  const usedDraft = Boolean(from_draft && draftText);

  const message = await Message.create({
    ticket: ticket._id,
    sender: admin._id,
    sender_name: admin.name,
    sender_role: ROLES.ADMIN,
    body,
    ai_assisted: usedDraft,
    ai_draft_edited: usedDraft ? body.trim() !== draftText : null,
  });

  const now = new Date();
  if (!ticket.first_response_at) ticket.first_response_at = now;
  if (resolve) {
    ticket.status = 'Resolved';
    ticket.resolved_at = now;
  } else if (ticket.status === 'Open') {
    ticket.status = 'In Progress';
  }
  if (!ticket.assigned_to) {
    ticket.assigned_to = admin._id;
    ticket.assigned_to_name = admin.name;
  }
  ticket.unread_for_author = true;
  ticket.last_activity_at = now;
  await ticket.save();

  events.messageCreated(ticket, message);
  events.ticketUpdated(ticket);
  return { message, ticket };
}

async function addNote(admin, id, note) {
  const ticket = await findTicketOr404(id);
  const created = await InternalNote.create({ ticket: ticket._id, admin: admin._id, admin_name: admin.name, note });
  events.noteCreated(ticket, created);
  return created;
}

module.exports = {
  createTicket,
  listAuthorTickets,
  getAuthorTicket,
  addAuthorMessage,
  listTickets,
  getAdminTicket,
  generateDraft,
  updateTicket,
  sendReply,
  addNote,
};
