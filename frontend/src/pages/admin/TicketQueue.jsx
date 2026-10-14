import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import CategoryBadge from '../../components/CategoryBadge';
import {
  Layers,
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  AlertCircle,
  User,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

export default function TicketQueue() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('urgency');

  const { socket } = useSocket();

  useEffect(() => {
    loadQueue();
  }, [statusFilter, categoryFilter, priorityFilter, sortBy]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleTicketCreated = (newTicket) => {
      setTickets((prev) => [newTicket, ...prev]);
    };

    const handleTicketUpdated = (updated) => {
      setTickets((prev) => prev.map((t) => (t._id === updated._id ? { ...t, ...updated } : t)));
    };

    socket.on('ticket_created', handleTicketCreated);
    socket.on('ticket_updated', handleTicketUpdated);

    return () => {
      socket.off('ticket_created', handleTicketCreated);
      socket.off('ticket_updated', handleTicketUpdated);
    };
  }, [socket]);

  const loadQueue = async () => {
    try {
      const res = await api.get('/admin/tickets', {
        params: {
          status: statusFilter,
          category: categoryFilter,
          priority: priorityFilter,
          search: search.trim() || undefined,
          sortBy,
        },
      });
      setTickets(res.data.data || []);
    } catch (err) {
      console.error('Failed to load tickets queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadQueue();
  };

  const isOlderThan48h = (createdDate) => {
    const ageMs = Date.now() - new Date(createdDate).getTime();
    return ageMs > 48 * 60 * 60 * 1000;
  };

  const statusOptions = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];
  const categoryOptions = [
    'All',
    'Royalty & Payments',
    'ISBN & Metadata Issues',
    'Printing & Quality',
    'Distribution & Availability',
    'Book Status & Production Updates',
    'General Inquiry',
  ];
  const priorityOptions = ['All', 'Critical', 'High', 'Medium', 'Low'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Ticket Queue</h1>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Live WebSocket Queue" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage incoming author queries with AI classification, priority scoring, and smart drafting.
          </p>
        </div>

        <div className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
          Queue Size: <strong className="text-slate-900 font-bold">{tickets.length}</strong> active tickets
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Top line: Search and Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by author, subject, ticket ID, or book..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </form>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="urgency">⚡ Urgent & Oldest Unresolved (Default)</option>
              <option value="newest">🕒 Newest First</option>
              <option value="oldest">📅 Oldest First</option>
            </select>
          </div>
        </div>

        {/* Filter Chips & Dropdowns */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Category & Priority Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {priorityOptions.map((p) => (
                <option key={p} value={p}>
                  {p === 'All' ? 'All Priorities' : `${p} Priority`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ticket List Table / Cards */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading incoming queue...</p>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Queue is Clear!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No tickets match your active filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const isCritical = ticket.priority === 'Critical';
            const isSLAAlert =
              isOlderThan48h(ticket.created_at) &&
              (ticket.status === 'Open' || ticket.status === 'In Progress');

            return (
              <Link
                key={ticket._id}
                to={`/admin/tickets/${ticket._id}`}
                className={`block bg-white p-5 rounded-2xl border transition group relative overflow-hidden ${
                  isCritical
                    ? 'border-red-300 ring-1 ring-red-500/20 shadow-sm hover:border-red-400'
                    : 'border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                {/* Critical top accent strip */}
                {isCritical && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
                )}

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Metadata & Subject */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {ticket.ticket_number}
                      </span>
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                      <CategoryBadge category={ticket.category} />

                      {ticket.ai_priority?.overridden && (
                        <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                          Priority Overridden
                        </span>
                      )}

                      {isSLAAlert && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-3 h-3" /> SLA Risk (&gt;48h)
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {ticket.subject}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                        {ticket.description}
                      </p>
                    </div>

                    {/* Author & Book Context line */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                      <span>
                        Author: <strong className="text-slate-800">{ticket.author_name}</strong> ({ticket.author_id})
                      </span>
                      <span>•</span>
                      <span>
                        Book: <strong className="text-slate-800">{ticket.book_title}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Right: Assigned + Date + Action */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right text-xs space-y-1">
                      <div className="flex items-center lg:justify-end gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-600">
                          {ticket.assigned_to_name ? (
                            <strong className="text-slate-800">{ticket.assigned_to_name}</strong>
                          ) : (
                            <span className="italic text-slate-400">Unassigned</span>
                          )}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center lg:justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 text-slate-400 flex items-center justify-center transition">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
