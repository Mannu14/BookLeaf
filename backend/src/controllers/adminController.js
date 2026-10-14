const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const InternalNote = require('../models/InternalNote');
const Author = require('../models/Author');
const Book = require('../models/Book');
const aiService = require('../services/aiService');
const {
  emitTicketUpdated,
  emitNewMessage,
  emitNewInternalNote,
} = require('../services/socketService');

// GET /api/admin/tickets (Ticket Queue with comprehensive filtering and priority sorting)
const getAllTickets = async (req, res, next) => {
  try {
    const { status, category, priority, search, sortBy } = req.query;

    const query = {};
    if (status && status !== 'All') query.status = status;
    if (category && category !== 'All') query.category = category;
    if (priority && priority !== 'All') query.priority = priority;

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { subject: searchRegex },
        { description: searchRegex },
        { author_name: searchRegex },
        { author_email: searchRegex },
        { ticket_number: searchRegex },
        { book_title: searchRegex },
      ];
    }

    let sortOption = { created_at: -1 };
    if (sortBy === 'oldest') {
      sortOption = { created_at: 1 };
    } else if (sortBy === 'urgency') {
      // Urgent unresolved first
      // Note: MongoDB enum order mapping or collation
      sortOption = { status: 1, priority: 1, created_at: 1 };
    }

    const tickets = await Ticket.find(query)
      .populate('book', 'title isbn status royalty_pending total_royalty_earned')
      .populate('assigned_to', 'name email')
      .sort(sortOption);

    // If urgency sorting requested, sort Critical > High > Medium > Low in-memory for accuracy
    let sortedTickets = tickets;
    if (sortBy === 'urgency') {
      const priorityWeights = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      const statusWeights = { Open: 3, 'In Progress': 2, Resolved: 1, Closed: 0 };

      sortedTickets = [...tickets].sort((a, b) => {
        const statusDiff = (statusWeights[b.status] || 0) - (statusWeights[a.status] || 0);
        if (statusDiff !== 0) return statusDiff;
        const priorityDiff = (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.created_at) - new Date(b.created_at); // oldest first among equals
      });
    }

    res.json({
      success: true,
      count: sortedTickets.length,
      data: sortedTickets,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/tickets/:id (Full Ticket details with private notes and author financial context)
const getTicketDetailsAdmin = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('book')
      .populate('author', 'name email phone city joined_date')
      .populate('assigned_to', 'name email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Public conversation thread
    const messages = await Message.find({ ticket: ticket._id }).sort({ created_at: 1 });

    // Private internal notes (Admin only)
    const internalNotes = await InternalNote.find({ ticket: ticket._id }).sort({ created_at: 1 });

    // Fetch author's other books and total pending royalty for complete operational context
    const authorBooks = await Book.find({ author_id: ticket.author_id });
    const authorContext = {
      totalBooks: authorBooks.length,
      totalEarned: authorBooks.reduce((s, b) => s + (b.total_royalty_earned || 0), 0),
      totalPaid: authorBooks.reduce((s, b) => s + (b.royalty_paid || 0), 0),
      totalPending: authorBooks.reduce((s, b) => s + (b.royalty_pending || 0), 0),
      booksList: authorBooks.map((b) => ({
        id: b._id,
        title: b.title,
        status: b.status,
        isbn: b.isbn,
        pending: b.royalty_pending,
      })),
    };

    res.json({
      success: true,
      data: {
        ticket,
        messages,
        internalNotes,
        authorContext,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/tickets/:id (Update status, assign, or override AI classification / priority)
const updateTicketAdmin = async (req, res, next) => {
  try {
    const { status, category, priority, assignToSelf, assigneeId } = req.body;
    const adminUser = req.user;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Status change
    if (status && status !== ticket.status) {
      ticket.status = status;
      if (status === 'Resolved' || status === 'Closed') {
        ticket.resolved_at = new Date();
      }
    }

    // Priority override
    if (priority && priority !== ticket.priority) {
      ticket.priority = priority;
      if (!ticket.ai_priority) ticket.ai_priority = {};
      ticket.ai_priority.overridden = true;
      ticket.ai_priority.overridden_by = adminUser ? adminUser.name : 'Admin';
      ticket.ai_priority.overridden_at = new Date();
      ticket.markModified('ai_priority');
    }

    // Category override
    if (category && category !== ticket.category) {
      ticket.category = category;
      if (!ticket.ai_classification) ticket.ai_classification = {};
      ticket.ai_classification.overridden = true;
      ticket.ai_classification.overridden_by = adminUser ? adminUser.name : 'Admin';
      ticket.ai_classification.overridden_at = new Date();
      ticket.markModified('ai_classification');
    }

    // Assignment
    if (assignToSelf) {
      ticket.assigned_to = adminUser._id;
      ticket.assigned_to_name = adminUser.name;
    } else if (assigneeId !== undefined) {
      if (assigneeId === null) {
        ticket.assigned_to = null;
        ticket.assigned_to_name = null;
      } else {
        const assignee = await Author.findById(assigneeId);
        if (assignee) {
          ticket.assigned_to = assignee._id;
          ticket.assigned_to_name = assignee.name;
        }
      }
    }

    await ticket.save();

    emitTicketUpdated(ticket);

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/tickets/:id/ai-draft (Re-generate or refine AI response draft)
const regenerateAIDraft = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('book');
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const author = await Author.findById(ticket.author);
    const messages = await Message.find({ ticket: ticket._id }).sort({ created_at: 1 });

    const draftResult = await aiService.generateReplyDraft({
      ticket,
      author: author || { name: ticket.author_name, email: ticket.author_email },
      book: ticket.book,
      conversationHistory: messages,
    });

    ticket.ai_draft_response = {
      draft: draftResult.draft,
      model_used: draftResult.modelUsed,
      generated_at: new Date(),
      token_estimate: draftResult.tokensEstimated,
      policy_applied: draftResult.policiesApplied,
    };
    await ticket.save();

    emitTicketUpdated(ticket);

    res.json({
      success: true,
      message: 'AI response draft generated successfully',
      data: ticket.ai_draft_response,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/tickets/:id/replies (Send admin reply to author)
const sendAdminReply = async (req, res, next) => {
  try {
    const { message, isAIDrafted, resolveTicket } = req.body;
    const adminUser = req.user;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Reply message cannot be empty' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Create public thread message
    const newMsg = new Message({
      ticket: ticket._id,
      sender: adminUser._id,
      sender_name: adminUser.name,
      sender_role: 'admin',
      message: message.trim(),
      is_ai_drafted: Boolean(isAIDrafted),
      edited_by_admin: true,
    });
    await newMsg.save();

    // Auto-update ticket status
    if (resolveTicket) {
      ticket.status = 'Resolved';
      ticket.resolved_at = new Date();
    } else if (ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    // Auto-assign to responding admin if unassigned
    if (!ticket.assigned_to) {
      ticket.assigned_to = adminUser._id;
      ticket.assigned_to_name = adminUser.name;
    }

    await ticket.save();

    // Broadcast real-time message and ticket status update
    emitNewMessage(ticket._id, ticket.author_id, newMsg);
    emitTicketUpdated(ticket);

    res.status(201).json({
      success: true,
      message: 'Reply sent to author successfully',
      data: newMsg,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/tickets/:id/notes (Add private internal note)
const addInternalNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    const adminUser = req.user;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text cannot be empty' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const newNote = new InternalNote({
      ticket: ticket._id,
      author: adminUser._id,
      author_name: adminUser.name,
      note: note.trim(),
    });
    await newNote.save();

    emitNewInternalNote(ticket._id, newNote);

    res.status(201).json({
      success: true,
      message: 'Internal note saved successfully',
      data: newNote,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/stats (Dashboard summary statistics)
const getAdminStats = async (req, res, next) => {
  try {
    const totalTickets = await Ticket.countDocuments();
    const openTickets = await Ticket.countDocuments({ status: 'Open' });
    const inProgressTickets = await Ticket.countDocuments({ status: 'In Progress' });
    const resolvedTickets = await Ticket.countDocuments({ status: 'Resolved' });
    const criticalTickets = await Ticket.countDocuments({
      priority: 'Critical',
      status: { $in: ['Open', 'In Progress'] },
    });

    // Unresolved tickets older than 48h (SLA breach risk)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const slaRiskCount = await Ticket.countDocuments({
      status: { $in: ['Open', 'In Progress'] },
      created_at: { $lt: twoDaysAgo },
    });

    const categoriesBreakdown = await Ticket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        criticalTickets,
        slaRiskCount,
        categoriesBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/authors (Author Directory with financial rollups)
const getAllAuthors = async (req, res, next) => {
  try {
    const authors = await Author.find({ role: 'author' }).select('-password').sort({ joined_date: -1 });

    const authorsWithData = await Promise.all(
      authors.map(async (author) => {
        const books = await Book.find({ author_id: author.author_id });
        const ticketsCount = await Ticket.countDocuments({ author_id: author.author_id });
        const openTicketsCount = await Ticket.countDocuments({
          author_id: author.author_id,
          status: { $in: ['Open', 'In Progress'] },
        });

        return {
          ...author.toObject(),
          booksCount: books.length,
          totalCopiesSold: books.reduce((s, b) => s + (b.total_copies_sold || 0), 0),
          totalRoyaltyEarned: books.reduce((s, b) => s + (b.total_royalty_earned || 0), 0),
          royaltyPaid: books.reduce((s, b) => s + (b.royalty_paid || 0), 0),
          royaltyPending: books.reduce((s, b) => s + (b.royalty_pending || 0), 0),
          ticketsCount,
          openTicketsCount,
        };
      })
    );

    res.json({
      success: true,
      count: authorsWithData.length,
      data: authorsWithData,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllTickets,
  getTicketDetailsAdmin,
  updateTicketAdmin,
  regenerateAIDraft,
  sendAdminReply,
  addInternalNote,
  getAdminStats,
  getAllAuthors,
};
