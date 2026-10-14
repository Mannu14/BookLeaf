import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bookleaf_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('bookleaf_token'));
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState([]);

  useEffect(() => {
    // Fetch demo users for the quick switcher
    api
      .get('/auth/demo-users')
      .then((res) => {
        if (res.data?.data) {
          setDemoUsers(res.data.data);
        }
      })
      .catch((err) => console.warn('Could not load demo users:', err.message));

    // Verify existing token
    if (token) {
      api
        .get('/auth/me')
        .then((res) => {
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('bookleaf_user', JSON.stringify(res.data.user));
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('bookleaf_token', receivedToken);
    localStorage.setItem('bookleaf_user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);

    // Connect socket to appropriate room
    const socket = getSocket();
    if (receivedUser.role === 'admin') {
      socket.emit('join_admin_room');
    } else {
      socket.emit('join_author_room', receivedUser.author_id);
    }

    return receivedUser;
  };

  const logout = () => {
    localStorage.removeItem('bookleaf_token');
    localStorage.removeItem('bookleaf_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        demoUsers,
        login,
        logout,
        isAdmin: user?.role === 'admin',
        isAuthor: user?.role === 'author',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

