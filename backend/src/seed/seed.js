const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const Author = require('../models/Author');
const Book = require('../models/Book');
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const InternalNote = require('../models/InternalNote');
const aiService = require('../services/aiService');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting BookLeaf database seeding...');
    await connectDB();

    // 1. Clear existing collections
    console.log('🧹 Clearing previous collections...');
    await Author.deleteMany({});
    await Book.deleteMany({});
    await Ticket.deleteMany({});
    await Message.deleteMany({});
    await InternalNote.deleteMany({});

    // 2. Read sample dataset
    const sampleDataPath = path.join(__dirname, '../../../FULLSTACK-SAMPLEDATA.json');
    if (!fs.existsSync(sampleDataPath)) {
      throw new Error(`Sample data file not found at: ${sampleDataPath}`);
    }
    const rawData = fs.readFileSync(sampleDataPath, 'utf8');
    const { authors } = JSON.parse(rawData);

    // 3. Create Admin Account
    console.log('👤 Creating default Admin account...');
    const adminUser = new Author({
      author_id: 'ADMIN001',
      name: 'Aditi Verma (Support Lead)',
      email: 'admin@bookleaf.pub',
      password: 'admin123',
      role: 'admin',
      phone: '+91-11-4567-8901',
      city: 'New Delhi',
      joined_date: new Date('2022-01-01'),
    });
    await adminUser.save();
    console.log(' Admin created: admin@bookleaf.pub / admin123');

    // 4. Seed Authors and Books
    console.log(`📚 Seeding ${authors.length} authors and their books...`);
    const createdAuthorsMap = new Map();
    const createdBooksMap = new Map();

    for (const authData of authors) {
      const authorDoc = new Author({
        author_id: authData.author_id,
        name: authData.name,
        email: authData.email,
        password: 'author123', // Standard demo password
        role: 'author',
        phone: authData.phone,
        city: authData.city,
        joined_date: new Date(authData.joined_date),
      });
      await authorDoc.save();
      createdAuthorsMap.set(authData.author_id, authorDoc);

      for (const bookData of authData.books) {
        const bookDoc = new Book({
          book_id: bookData.book_id,
          author_id: authData.author_id,
          author: authorDoc._id,
          title: bookData.title,
          isbn: bookData.isbn,
          genre: bookData.genre,
          publication_date: bookData.publication_date ? new Date(bookData.publication_date) : null,
          status: bookData.status,
          mrp: bookData.mrp,
          author_royalty_per_copy: bookData.author_royalty_per_copy,
          total_copies_sold: bookData.total_copies_sold || 0,
          total_royalty_earned: bookData.total_royalty_earned || 0,
          royalty_paid: bookData.royalty_paid || 0,
          royalty_pending: bookData.royalty_pending || 0,
          last_royalty_payout_date: bookData.last_royalty_payout_date
            ? new Date(bookData.last_royalty_payout_date)
            : null,
          print_partner: bookData.print_partner,
          available_on: bookData.available_on || [],
        });
        await bookDoc.save();
        createdBooksMap.set(bookData.book_id, bookDoc);
      }
    }
    console.log(` Seeded ${createdAuthorsMap.size} authors and ${createdBooksMap.size} books.`);

    // 5. Pre-seed Realistic Sample Tickets to showcase Admin Queue immediately
    console.log('🎫 Creating pre-seeded sample support tickets...');

    const sampleTicketConfigs = [
      {
        author_id: 'AUTH002', // Rohit Kapoor
        book_id: 'BK004', // Startup Sutra
        subject: 'Pending royalty payout is overdue by 6 months',
        description:
          'I published Startup Sutra over a year ago. As per my dashboard, I have ₹7,744 in pending royalties, but my last payout was on November 15, 2025. It has been several months and I have not received this balance in my bank account. Could you please check what is happening with this payment?',
        status: 'Open',
        assigned_to_admin: false,
      },
      {
        author_id: 'AUTH006', // Arjun Malhotra
        book_id: 'BK010', // Turban Tales
        subject: 'Incorrect ISBN linked on Flipkart marketplace listing',
        description:
          'A reader informed me that the Flipkart listing for Turban Tales is showing a completely different ISBN (ending in 02-8) instead of my physical book ISBN (978-93-5XXXX-10-3). This is causing orders to link to another book title!',
        status: 'Open',
        assigned_to_admin: false,
      },
      {
        author_id: 'AUTH001', // Priya Sharma
        book_id: 'BK001', // Whispers of the Ganges
        subject: 'Defective author copies received with blurry illustrations',
        description:
          'I received my package of 10 author copies of Whispers of the Ganges yesterday. In 4 of the copies, chapter 3 illustration is heavily smudged and the binding glue along the spine is separating. Can you please arrange a reprint?',
        status: 'In Progress',
        assigned_to_admin: true,
      },
      {
        author_id: 'AUTH007', // Sneha Kulkarni
        book_id: 'BK011', // The Algorithm of Love
        subject: 'Book suddenly showing "Currently Unavailable" on Amazon India',
        description:
          'My book The Algorithm of Love has been live for over two years, but since yesterday Amazon is showing "Currently Unavailable - We don\'t know when or if this item will be back in stock". Several readers reached out on Instagram saying they cannot place orders.',
        status: 'In Progress',
        assigned_to_admin: true,
      },
      {
        author_id: 'AUTH009', // Kavita Deshmukh
        book_id: 'BK015', // Raising Roots (In Production)
        subject: 'Inquiry regarding Typesetting timeline for Raising Roots',
        description:
          'Raising Roots has been in "Typesetting" stage for about three weeks now. I wanted to understand the expected timeline before proofreading begins so I can schedule my review time accordingly.',
        status: 'Open',
        assigned_to_admin: false,
      },
      {
        author_id: 'AUTH010', // Diya Chatterjee
        book_id: null,
        subject: 'Request to update author profile and biography on retail portals',
        description:
          'Can I submit an updated author biography and photo to replace the current snippet on Amazon author central and BookLeaf store?',
        status: 'Resolved',
        assigned_to_admin: true,
      },
    ];

    let tIndex = 1;
    for (const conf of sampleTicketConfigs) {
      const author = createdAuthorsMap.get(conf.author_id);
      const book = conf.book_id ? createdBooksMap.get(conf.book_id) : null;
      const bookTitle = book ? book.title : 'General / Account Level';

      // Run AI Classification & Priority
      const classification = await aiService.classifyTicket({
        subject: conf.subject,
        description: conf.description,
        bookTitle,
      });

      const priority = await aiService.calculatePriority({
        subject: conf.subject,
        description: conf.description,
        category: classification.category,
        authorContext: { author_id: author.author_id, name: author.name },
        bookContext: book,
      });

      const draft = await aiService.generateReplyDraft({
        ticket: {
          ticket_number: `BL-${1000 + tIndex}`,
          category: classification.category,
          priority: priority.priority,
          subject: conf.subject,
          description: conf.description,
        },
        author,
        book,
        conversationHistory: [],
      });

      const ticketDoc = new Ticket({
        ticket_number: `BL-${1000 + tIndex}`,
        author: author._id,
        author_id: author.author_id,
        author_name: author.name,
        author_email: author.email,
        book: book ? book._id : null,
        book_id: book ? book.book_id : null,
        book_title: bookTitle,
        subject: conf.subject,
        description: conf.description,
        category: classification.category,
        priority: priority.priority,
        status: conf.status,
        assigned_to: conf.assigned_to_admin ? adminUser._id : null,
        assigned_to_name: conf.assigned_to_admin ? adminUser.name : null,
        ai_classification: {
          category: classification.category,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          overridden: false,
        },
        ai_priority: {
          priority: priority.priority,
          confidence: priority.confidence,
          reasoning: priority.reasoning,
          overridden: false,
        },
        ai_draft_response: {
          draft: draft.draft,
          model_used: draft.modelUsed,
          generated_at: new Date(),
          token_estimate: draft.tokensEstimated,
          policy_applied: draft.policiesApplied,
        },
        created_at: new Date(Date.now() - (7 - tIndex) * 14 * 60 * 60 * 1000), // Staggered over recent days
      });
      await ticketDoc.save();

      // Initial Message
      const initMsg = new Message({
        ticket: ticketDoc._id,
        sender: author._id,
        sender_name: author.name,
        sender_role: 'author',
        message: conf.description,
        created_at: ticketDoc.created_at,
      });
      await initMsg.save();

      // If In Progress or Resolved, add admin responses or internal notes
      if (conf.status === 'In Progress') {
        const adminReply = new Message({
          ticket: ticketDoc._id,
          sender: adminUser._id,
          sender_name: adminUser.name,
          sender_role: 'admin',
          message: draft.draft,
          is_ai_drafted: true,
          edited_by_admin: true,
          created_at: new Date(ticketDoc.created_at.getTime() + 2 * 60 * 60 * 1000),
        });
        await adminReply.save();

        const internalNote = new InternalNote({
          ticket: ticketDoc._id,
          author: adminUser._id,
          author_name: adminUser.name,
          note: 'Escalated with the operations team. Tracking ticket with high urgency.',
          created_at: new Date(ticketDoc.created_at.getTime() + 1 * 60 * 60 * 1000),
        });
        await internalNote.save();
      } else if (conf.status === 'Resolved') {
        const adminReply = new Message({
          ticket: ticketDoc._id,
          sender: adminUser._id,
          sender_name: adminUser.name,
          sender_role: 'admin',
          message:
            'Dear Diya,\n\nWe have updated your biography and author profile on Amazon Author Central and the BookLeaf store catalog.\n\nPlease allow 24-48 hours for Amazon caches to refresh globally. Let us know if you need any additional adjustments!\n\nWarm regards,\nBookLeaf Support',
          is_ai_drafted: true,
          edited_by_admin: true,
          created_at: new Date(ticketDoc.created_at.getTime() + 5 * 60 * 60 * 1000),
        });
        await adminReply.save();
        ticketDoc.resolved_at = adminReply.created_at;
        await ticketDoc.save();
      }

      tIndex++;
    }

    console.log(` Seeded ${sampleTicketConfigs.length} sample tickets across categories and priorities.`);
    console.log('\n==========================================');
    console.log(' SEEDING COMPLETE SUCCESSFULLY!');
    console.log('==========================================');
    console.log('Admin Account: admin@bookleaf.pub | Password: admin123');
    console.log('Sample Authors: e.g. rohit.kapoor@email.com | Password: author123');
    console.log('==========================================\n');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

