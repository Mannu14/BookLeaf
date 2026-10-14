import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import AppShell from './components/AppShell';
import { LogoMark } from './components/Logo';

import Login from './pages/Login';
import AuthorOverview from './pages/author/Overview';
import MyBooks from './pages/author/MyBooks';
import MyTickets from './pages/author/MyTickets';
import AuthorTicket from './pages/author/TicketThread';
import TicketQueue from './pages/admin/TicketQueue';
import TicketWorkspace from './pages/admin/TicketWorkspace';
import Insights from './pages/admin/Insights';
import Authors from './pages/admin/Authors';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LogoMark className="h-10 w-10 animate-pulse" />
    </div>
  );
}

// Route guard: signed-in users only, optionally restricted to one role.
function RequireRole({ role }) {
  const { user, loading, token } = useAuth();
  if (loading || (token && !user)) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  return <Outlet />;
}

function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              <Route element={<GuestOnly />}>
                <Route path="/login" element={<Login />} />
              </Route>

              <Route element={<RequireRole role="author" />}>
                <Route element={<AppShell />}>
                  <Route index element={<AuthorOverview />} />
                  <Route path="books" element={<MyBooks />} />
                  <Route path="tickets" element={<MyTickets />} />
                  <Route path="tickets/:id" element={<AuthorTicket />} />
                </Route>
              </Route>

              <Route path="admin" element={<RequireRole role="admin" />}>
                <Route element={<AppShell />}>
                  <Route index element={<TicketQueue />} />
                  <Route path="tickets/:id" element={<TicketWorkspace />} />
                  <Route path="insights" element={<Insights />} />
                  <Route path="authors" element={<Authors />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
