import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import AuthorDashboard from './pages/author/AuthorDashboard';
import MyBooks from './pages/author/MyBooks';
import MyTickets from './pages/author/MyTickets';
import TicketDetailAuthor from './pages/author/TicketDetailAuthor';

import AdminDashboard from './pages/admin/AdminDashboard';
import TicketQueue from './pages/admin/TicketQueue';
import TicketDetailAdmin from './pages/admin/TicketDetailAdmin';
import AuthorsDirectory from './pages/admin/AuthorsDirectory';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Layout with Navbar
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 pb-12">{children}</main>
      <footer className="py-4 border-t border-slate-200 text-center text-xs text-slate-400">
        BookLeaf Publishing Support & AI Operations Portal • Full-Stack Developer Position
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Author Portal Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AuthorDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/books"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MyBooks />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MyTickets />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TicketDetailAuthor />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Admin Portal Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tickets"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Layout>
                    <TicketQueue />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tickets/:id"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Layout>
                    <TicketDetailAdmin />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/authors"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Layout>
                    <AuthorsDirectory />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
