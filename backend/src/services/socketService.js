let io = null;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  const config = require('../config/config');

  io = new Server(server, {
    cors: {
      origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Client joins role-based room
    socket.on('join_author_room', (authorId) => {
      if (authorId) {
        socket.join(`author_${authorId}`);
        // console.log(`Author joined room: author_${authorId}`);
      }
    });

    socket.on('join_admin_room', () => {
      socket.join('admin_queue');
      // console.log(`Admin joined room: admin_queue`);
    });

    socket.on('join_ticket', (ticketId) => {
      if (ticketId) {
        socket.join(`ticket_${ticketId}`);
        // console.log(`Socket joined ticket room: ticket_${ticketId}`);
      }
    });

    socket.on('leave_ticket', (ticketId) => {
      if (ticketId) {
        socket.leave(`ticket_${ticketId}`);
      }
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    // Return dummy emitter if socket is not initialized (e.g. during standalone tests)
    return {
      to: () => ({ emit: () => {} }),
      emit: () => {},
    };
  }
  return io;
};

// Notification helper functions
const emitNewTicket = (ticket) => {
  const socketIO = getIO();
  socketIO.to('admin_queue').emit('ticket_created', ticket);
  socketIO.to(`author_${ticket.author_id}`).emit('ticket_created', ticket);
};

const emitTicketUpdated = (ticket) => {
  const socketIO = getIO();
  socketIO.to('admin_queue').emit('ticket_updated', ticket);
  socketIO.to(`author_${ticket.author_id}`).emit('ticket_updated', ticket);
  socketIO.to(`ticket_${ticket._id}`).emit('ticket_updated', ticket);
};

const emitNewMessage = (ticketId, authorId, message) => {
  const socketIO = getIO();
  socketIO.to(`ticket_${ticketId}`).emit('new_message', { ticketId, message });
  socketIO.to(`author_${authorId}`).emit('ticket_activity', { ticketId, message });
  socketIO.to('admin_queue').emit('ticket_activity', { ticketId, message });
};

const emitNewInternalNote = (ticketId, note) => {
  const socketIO = getIO();
  // Internal notes ONLY go to admins
  socketIO.to('admin_queue').emit('new_internal_note', { ticketId, note });
  socketIO.to(`ticket_${ticketId}`).emit('new_internal_note', { ticketId, note });
};

module.exports = {
  initSocket,
  getIO,
  emitNewTicket,
  emitTicketUpdated,
  emitNewMessage,
  emitNewInternalNote,
};
