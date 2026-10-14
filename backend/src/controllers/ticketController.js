const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const Book = require('../models/Book');
const aiService = require('../services/aiService');
const {
  emitNewTicket,
  emitNewMessage,
  emitTicketUpdated,
} = require('../services/socketService');

// Helper to generate human-readable ticket numbers
const generateTicketNumber = async () => {
  const count = await Ticket.countDocuments();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `BL-${1000 + count + 1}-${randomSuffix}`;
};

// POST /api/tickets (Author creates support ticket)
const createTicket = async (req, res, next) => {
  try {
    const { book_id, subject, description, attachment } = req.body;
    const author = req.user;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required.',
      });
    }

    let book = null;
    let bookTitle = 'General / Account Level';
    if (book_id && book_id !== 'general') {
      book = await Book.findOne({ _id: book_id, author_id: author.author_id });
      if (book) {
        bookTitle = book.title;
      }
    }

    // 1. AI Auto-Classification
    const classificationResult = await aiService.classifyTicket({
      subject,
      description,
      bookTitle,
    });

    // 2. AI Priority Scoring
    const priorityResult = await aiService.calculatePriority({
      subject,
      description,
      category: classificationResult.category,
      authorContext: {
        author_id: author.author_id,
        name: author.name,
      },
      bookContext: book,
    });

    // Generate unique Ticket ID
    const ticketNumber = await generateTicketNumber();

    // 3. AI Initial Reply Draft
    const draftResult = await aiService.generateReplyDraft({
      ticket: {
        ticket_number: ticketNumber,
        category: classificationResult.category,
        priority: priorityResult.priority,
        subject,
        description,
      },
      author,
      book,
      conversationHistory: [],
    });

    // Create Ticket document
    const newTicket = new Ticket({
      ticket_number: ticketNumber,
      author: author._id,
      author_id: author.author_id,
      author_name: author.name,
      author_email: author.email,
      book: book ? book._id : null,
      book_id: book ? book.book_id : null,
      book_title: bookTitle,
      subject,
      description,
      category: classificationResult.category,
      priority: priorityResult.priority,
      status: 'Open',
      ai_classification: {
        category: classificationResult.category,
        confidence: classificationResult.confidence,
        reasoning: classificationResult.reasoning,
        overridden: false,
      },
      ai_priority: {
        priority: priorityResult.priority,
        confidence: priorityResult.confidence,
        reasoning: priorityResult.reasoning,
        overridden: false,
      },
      ai_draft_response: {
        draft: draftResult.draft,
        model_used: draftResult.modelUsed,
        generated_at: new Date(),
        token_estimate: draftResult.tokensEstimated,
        policy_applied: draftResult.policiesApplied,
      },
      attachment: attachment || null,
    });

    await newTicket.save();

    // Create the initial author query as the first message in thread
    const initialMessage = new Message({
      ticket: newTicket._id,
      sender: author._id,
      sender_name: author.name,
      sender_role: 'author',
      message: description,
    });
    await initialMessage.save();

    // Emit real-time notification
    emitNewTicket(newTicket);

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      data: newTicket,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/tickets/my (Author views their tickets)
const getMyTickets = async (req, res, next) => {
  try {
    const authorId = req.user.author_id;
    const { status, category } = req.query;

    const query = { author_id: authorId };
    if (status && status !== 'All') query.status = status;
    if (category && category !== 'All') query.category = category;

    const tickets = await Ticket.find(query)
      .populate('book', 'title isbn status royalty_pending')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/tickets/:id (Author views single ticket thread)
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('book');
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Role security: Author can ONLY access their own ticket
    if (req.user.role !== 'admin' && ticket.author_id !== req.user.author_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own tickets.',
      });
    }

    // Fetch conversation thread (public messages only)
    const messages = await Message.find({ ticket: ticket._id }).sort({ created_at: 1 });

    res.json({
      success: true,
      data: {
        ticket,
        messages,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/tickets/:id/messages (Author replies to ticket)
const addAuthorMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.author_id !== req.user.author_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot reply to another author\'s ticket.',
      });
    }

    // If ticket was resolved/closed, reopen it when author responds
    if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
      ticket.status = 'In Progress';
      await ticket.save();
      emitTicketUpdated(ticket);
    }

    const newMessage = new Message({
      ticket: ticket._id,
      sender: req.user._id,
      sender_name: req.user.name,
      sender_role: 'author',
      message: message.trim(),
    });
    await newMessage.save();

    emitNewMessage(ticket._id, ticket.author_id, newMessage);

    res.status(201).json({
      success: true,
      data: newMessage,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  addAuthorMessage,
};
