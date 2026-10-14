import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, TOKEN_KEY } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Restore the session on first load.
  useEffect(() => {
    if (!token || user) return;
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(logout)
      .finally(() => setLoading(false));
  }, [token, user, logout]);

  // Any 401 from the API (expired token, deleted account) signs the user out.
  useEffect(() => {
    window.addEventListener('bookleaf:unauthorized', logout);
    return () => window.removeEventListener('bookleaf:unauthorized', logout);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: nextToken, user: nextUser } = res.data.data;
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get('/auth/me');
    setUser(res.data.data);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      logout,
      refreshUser,
      isAdmin: user?.role === 'admin',
    }),
    [token, user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
