import React, { createContext, useContext, useEffect } from 'react';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socket = getSocket();

  useEffect(() => {
    if (!user) return;

    if (user.role === 'admin') {
      socket.emit('join_admin_room');
    } else if (user.role === 'author' && user.author_id) {
      socket.emit('join_author_room', user.author_id);
    }
  }, [user, socket]);

  const joinTicketRoom = (ticketId) => {
    if (ticketId) {
      socket.emit('join_ticket', ticketId);
    }
  };

  const leaveTicketRoom = (ticketId) => {
    if (ticketId) {
      socket.emit('leave_ticket', ticketId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        joinTicketRoom,
        leaveTicketRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
