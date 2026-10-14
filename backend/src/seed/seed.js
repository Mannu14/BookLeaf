const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Book = require('../models/Book');
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const InternalNote = require('../models/InternalNote');
const Counter = require('../models/Counter');
const { aiService } = require('../ai/aiService');
const logger = require('../utils/logger');
const sampleTickets = require('./sampleTickets');

const DATA_FILE = path.join(__dirname, 'bookleaf_sample_data.json');

const DEMO_PASSWORDS = {
  author: process.env.SEED_AUTHOR_PASSWORD || 'author123',
  admin: process.env.SEED_ADMIN_PASSWORD || 'admin123',
};

const ADMINS = [
  { author_id: 'ADMIN001', name: 'Aditi Verma', email: 'admin@bookleaf.pub', city: 'New Delhi' },
  { author_id: 'ADMIN002', name: 'Karan Mehta', email: 'karan@bookleaf.pub', city: 'New Delhi' },
];

const toDate = (v) => (v ? new Date(v) : null);
const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000);

async function clearAll() {
  await Promise.all([User, Book, Ticket, Message, InternalNote, Counter].map((M) => M.deleteMany({})));
}

async function seedUsersAndBooks() {
  const { authors } = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  const admins = [];
  for (const a of ADMINS) {
    admins.push(await User.create({ ...a, role: 'admin', password: DEMO_PASSWORDS.admin, joined_date: new Date('2022-01-01') }));
  }

  const users = new Map();
  const books = new Map();
  for (const a of authors) {
    const user = await User.create({
      author_id: a.author_id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      city: a.city,
      joined_date: toDate(a.joined_date),
      role: 'author',
      password: DEMO_PASSWORDS.author,
    });
    users.set(a.author_id, user);

    for (const b of a.books) {
      const book = await Book.create({
        ...b,
        author_id: a.author_id,
        author: user._id,
        publication_date: toDate(b.publication_date),
        last_royalty_payout_date: toDate(b.last_royalty_payout_date),
      });
      books.set(b.book_id, book);
    }
  }

  return { admins, users, books };
}

async function seedTickets({ admins, users, books }) {
  const [lead] = admins;
  let n = 1000;

  for (const t of sampleTickets) {
    const user = users.get(t.author_id);
    const book = t.book_id ? books.get(t.book_id) : null;
    const createdAt = hoursAgo(t.ageHours);
    const triage = await aiService.triage({ subject: t.subject, description: t.description, book });

    n += 1;
    const ticket = new Ticket({
      ticket_number: `BL-${n}`,
      author: user._id,
      author_id: user.author_id,
      author_name: user.name,
      author_email: user.email,
      book: book?._id || null,
      book_id: book?.book_id || null,
      book_title: book?.title || 'General / Account Level',
      subject: t.subject,
      description: t.description,
      category: triage.category.value,
      priority: triage.priority.value,
      status: t.status,
      ai_category: triage.category,
      ai_priority: triage.priority,
      ai_triage_meta: triage.meta,
      created_at: createdAt,
      last_activity_at: createdAt,
    });
    await ticket.save();

    await Message.create({
      ticket: ticket._id,
      sender: user._id,
      sender_name: user.name,
      sender_role: 'author',
      body: t.description,
      created_at: createdAt,
    });

    if (t.replied) {
      const repliedAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);
      const draft = await aiService.draftReply({ ticket, author: user, book, messages: [] });
      await Message.create({
        ticket: ticket._id,
        sender: lead._id,
        sender_name: lead.name,
        sender_role: 'admin',
        body: draft.text,
        ai_assisted: true,
        ai_draft_edited: false,
        created_at: repliedAt,
      });
      Object.assign(ticket, {
        assigned_to: lead._id,
        assigned_to_name: lead.name,
        first_response_at: repliedAt,
        last_activity_at: repliedAt,
        unread_for_author: true,
        resolved_at: t.status === 'Resolved' ? repliedAt : null,
      });
      await ticket.save();
    }

    if (t.note) {
      await InternalNote.create({
        ticket: ticket._id,
        admin: lead._id,
        admin_name: lead.name,
        note: t.note,
        created_at: new Date(createdAt.getTime() + 60 * 60 * 1000),
      });
    }
  }

  // Continue numbering after the seeded tickets.
  await Counter.findByIdAndUpdate('ticket', { seq: n }, { upsert: true });
}

async function seedDatabase({ withTickets = true } = {}) {
  await clearAll();
  const ctx = await seedUsersAndBooks();
  if (withTickets) await seedTickets(ctx);
  logger.info(`Seeded ${ctx.users.size} authors, ${ctx.books.size} books, ${ctx.admins.length} admins${withTickets ? `, ${sampleTickets.length} tickets` : ''}.`);
  return ctx;
}

async function seedIfEmpty() {
  if ((await User.estimatedDocumentCount()) > 0) return false;
  logger.info('Empty database detected, loading sample data...');
  await seedDatabase();
  return true;
}

module.exports = { seedDatabase, seedIfEmpty, DEMO_PASSWORDS };

// CLI: `npm run seed` wipes and reseeds the configured database.
if (require.main === module) {
  const { connectDB, disconnectDB } = require('../config/db');
  (async () => {
    const { inMemory } = await connectDB({ allowInMemory: false }).catch((err) => {
      logger.error(`Cannot reach MongoDB: ${err.message}`);
      logger.error('Start MongoDB or set MONGODB_URI. (The server itself can run without it and seeds an in-memory DB automatically.)');
      process.exit(1);
    });
    if (!inMemory) await seedDatabase();
    await disconnectDB();
    logger.info('Login: admin@bookleaf.pub / admin123, any author email / author123');
  })().catch(async (err) => {
    logger.error('Seeding failed:', err);
    await disconnectDB();
    process.exit(1);
  });
}
