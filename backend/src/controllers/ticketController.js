const tickets = require('../services/ticketService');
const { toAuthorTicket, toMessage } = require('../services/serializers');
const { asyncHandler } = require('../utils/http');

// POST /api/tickets
const create = asyncHandler(async (req, res) => {
  const ticket = await tickets.createTicket(req.user, req.body);
  res.status(201).json({ success: true, data: toAuthorTicket(ticket) });
});

// GET /api/tickets
const list = asyncHandler(async (req, res) => {
  const items = await tickets.listAuthorTickets(req.user, req.query);
  res.json({ success: true, data: items.map(toAuthorTicket) });
});

// GET /api/tickets/:id
const get = asyncHandler(async (req, res) => {
  const { ticket, messages } = await tickets.getAuthorTicket(req.user, req.params.id);
  res.json({ success: true, data: { ticket: toAuthorTicket(ticket), messages: messages.map(toMessage) } });
});

// POST /api/tickets/:id/messages
const addMessage = asyncHandler(async (req, res) => {
  const message = await tickets.addAuthorMessage(req.user, req.params.id, req.body.body);
  res.status(201).json({ success: true, data: toMessage(message) });
});

module.exports = { create, list, get, addMessage };
