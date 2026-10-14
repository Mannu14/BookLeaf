import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Inbox, LayoutDashboard, LogOut, Menu, MessagesSquare, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Logo from './Logo';
import { Avatar, LiveDot } from './ui';
import { cn } from '../lib/cn';

const AUTHOR_NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/books', label: 'My books', icon: BookOpen },
  { to: '/tickets', label: 'Support', icon: MessagesSquare },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Ticket queue', icon: Inbox, end: true },
  { to: '/admin/insights', label: 'Insights', icon: LayoutDashboard },
  { to: '/admin/authors', label: 'Authors', icon: Users },
];

function Sidebar({ onNavigate }) {
  const { user, isAdmin, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const nav = isAdmin ? ADMIN_NAV : AUTHOR_NAV;

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <Logo subtitle={isAdmin ? 'Support operations' : 'Author portal'} />
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] transition',
                isActive ? 'bg-white font-medium text-ink shadow-card ring-1 ring-line' : 'text-ink-soft hover:bg-ink/[0.04] hover:text-ink'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-4 w-4 transition', isActive ? 'text-leaf-600' : 'text-ink-muted group-hover:text-ink-soft')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 text-[12px] text-ink-muted" title={connected ? 'Receiving live updates' : 'Reconnecting'}>
          <LiveDot active={connected} />
          {connected ? 'Live updates on' : 'Reconnecting...'}
        </div>
      </div>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user?.name} tone={isAdmin ? 'ink' : 'leaf'} size="sm" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium">{user?.name}</p>
            <p className="truncate text-[12px] text-ink-muted">{isAdmin ? 'BookLeaf team' : user?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="rounded-md p-1.5 text-ink-muted transition hover:bg-ink/[0.05] hover:text-ink"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-paper lg:block">
        <Sidebar />
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button onClick={() => setMenuOpen(true)} className="rounded-md p-2 text-ink-soft hover:bg-ink/5" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink/30" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-slide-in bg-paper shadow-pop">
            <button onClick={() => setMenuOpen(false)} className="absolute right-3 top-5 rounded-md p-1.5 text-ink-muted" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 lg:py-10">
        <div key={location.pathname} className="animate-fade-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
