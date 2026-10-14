import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DemoSwitcherModal from './DemoSwitcherModal';
import {
  BookOpen,
  LifeBuoy,
  Layers,
  BarChart3,
  Users,
  LogOut,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link to={isAdmin ? '/admin/tickets' : '/'} className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
                  🍃
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-slate-900">
                      BookLeaf
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {isAdmin ? 'Operations' : 'Author Hub'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">Publishing Support Portal</div>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                {isAdmin ? (
                  <>
                    <Link
                      to="/admin/tickets"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive('/admin/tickets')
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      Ticket Queue
                    </Link>
                    <Link
                      to="/admin/dashboard"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive('/admin/dashboard')
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      Analytics & SLA
                    </Link>
                    <Link
                      to="/admin/authors"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive('/admin/authors')
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Authors Directory
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive('/')
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <Link
                      to="/books"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive('/books')
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      My Books
                    </Link>
                    <Link
                      to="/tickets"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive('/tickets')
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <LifeBuoy className="w-4 h-4" />
                      Support Tickets
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* Right Side: Demo Switcher + Profile + Logout */}
            <div className="flex items-center gap-2.5">
              {/* Quick Switcher Button */}
              <button
                onClick={() => setIsSwitcherOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1.5 rounded-lg transition shadow-xs"
                title="Switch test accounts"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span className="hidden sm:inline">Switch User</span>
              </button>

              {/* Real-time Indicator */}
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Sync</span>
              </div>

              {/* User Profile Pill */}
              {user && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-800 leading-tight">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {user.role === 'admin' ? 'Admin Team' : user.author_id}
                    </div>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm ${
                      isAdmin ? 'bg-indigo-600' : 'bg-emerald-600'
                    }`}
                  >
                    {isAdmin ? <Shield className="w-4 h-4" /> : user.name.charAt(0)}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Log out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Account Switcher Modal */}
      <DemoSwitcherModal isOpen={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} />
    </>
  );
}

