const { Server } = require('socket.io');
const config = require('../config/config');
const logger = require('../utils/logger');
const { userFromToken } = require('../middleware/auth');
const { toAuthorTicket, toMessage, toAdminMessage } = require('../services/serializers');
const { ROLES } = require('../constants');

// Rooms are assigned by the server from the verified JWT. Clients cannot pick
// a room, so an author can never receive another author's events or any
// admin-only payload (internal notes, AI triage, drafts).
const ADMIN_ROOM = 'admins';
const authorRoom = (authorId) => `author:${authorId}`;

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      socket.data.user = await userFromToken(socket.handshake.auth?.token);
      next();
    } catch (err) {
      next(new Error(err.message || 'Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    socket.join(user.role === ROLES.ADMIN ? ADMIN_ROOM : authorRoom(user.author_id));
  });

  logger.info('Socket.IO ready');
  return io;
}

// No-ops when sockets are not initialised (unit tests, seed script).
const emit = (room, event, payload) => {
  if (io) io.to(room).emit(event, payload);
};

const events = {
  ticketCreated(ticket) {
    emit(ADMIN_ROOM, 'ticket:created', ticket.toObject ? ticket.toObject() : ticket);
    emit(authorRoom(ticket.author_id), 'ticket:created', toAuthorTicket(ticket));
  },

  ticketUpdated(ticket) {
    emit(ADMIN_ROOM, 'ticket:updated', ticket.toObject ? ticket.toObject() : ticket);
    emit(authorRoom(ticket.author_id), 'ticket:updated', toAuthorTicket(ticket));
  },

  messageCreated(ticket, message) {
    emit(ADMIN_ROOM, 'message:created', { ticketId: String(ticket._id), message: toAdminMessage(message) });
    emit(authorRoom(ticket.author_id), 'message:created', { ticketId: String(ticket._id), message: toMessage(message) });
  },

  noteCreated(ticket, note) {
    emit(ADMIN_ROOM, 'note:created', { ticketId: String(ticket._id), note });
  },

  draftReady(ticket) {
    emit(ADMIN_ROOM, 'draft:ready', { ticketId: String(ticket._id), draft: ticket.ai_draft });
  },
};

module.exports = { initSocket, events };
