import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext({ socket: null, connected: false });

// One socket per session. The server places it in the right room based on
// the JWT, so the client never asks to join anything.
export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return undefined;

    const s = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    setSocket(s);

    return () => {
      s.close();
      setSocket(null);
      setConnected(false);
    };
  }, [token]);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

// Subscribe to a socket event for the lifetime of a component. The handler is
// kept in a ref so callers do not need to memoise it.
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (payload) => ref.current(payload);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}
