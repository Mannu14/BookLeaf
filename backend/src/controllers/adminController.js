const tickets = require('../services/ticketService');
const stats = require('../services/statsService');
const User = require('../models/User');
const { toAdminMessage } = require('../services/serializers');
const { aiService } = require('../ai/aiService');
const { asyncHandler } = require('../utils/http');
const { ROLES } = require('../constants');

// GET /api/admin/tickets
const listTickets = asyncHandler(async (req, res) => {
  const { items, ...pagination } = await tickets.listTickets(req.user, req.query);
  res.json({ success: true, data: items, meta: pagination });
});

// GET /api/admin/tickets/:id
const getTicket = asyncHandler(async (req, res) => {
  const { ticket, messages, notes, authorContext } = await tickets.getAdminTicket(req.params.id);
  res.json({
    success: true,
    data: { ticket, messages: messages.map(toAdminMessage), notes, author_context: authorContext },
  });
});

// PATCH /api/admin/tickets/:id
const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await tickets.updateTicket(req.user, req.params.id, req.body);
  res.json({ success: true, data: ticket });
});

// POST /api/admin/tickets/:id/draft
const generateDraft = asyncHandler(async (req, res) => {
  const draft = await tickets.generateDraft(req.params.id);
  res.status(201).json({ success: true, data: draft });
});

// POST /api/admin/tickets/:id/replies
const sendReply = asyncHandler(async (req, res) => {
  const { message, ticket } = await tickets.sendReply(req.user, req.params.id, req.body);
  res.status(201).json({ success: true, data: { message: toAdminMessage(message), ticket } });
});

// POST /api/admin/tickets/:id/notes
const addNote = asyncHandler(async (req, res) => {
  const note = await tickets.addNote(req.user, req.params.id, req.body.note);
  res.status(201).json({ success: true, data: note });
});

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { ...(await stats.dashboardStats()), ai_status: aiService.status } });
});

// GET /api/admin/authors
const listAuthors = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await stats.authorDirectory() });
});

// GET /api/admin/team
const listTeam = asyncHandler(async (req, res) => {
  const admins = await User.find({ role: ROLES.ADMIN }).sort({ name: 1 });
  res.json({ success: true, data: admins.map((a) => a.toPublicJSON()) });
});

module.exports = { listTickets, getTicket, updateTicket, generateDraft, sendReply, addNote, getStats, listAuthors, listTeam };
