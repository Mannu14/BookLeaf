import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import CategoryBadge from '../../components/CategoryBadge';
import NewTicketModal from './NewTicketModal';
import {
  LifeBuoy,
  PlusCircle,
  Filter,
  ArrowRight,
  MessageSquare,
  Clock,
  Sparkles,
  Paperclip,
} from 'lucide-react';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { socket } = useSocket();

  useEffect(() => {
    loadTickets();
    loadBooks();
  }, [statusFilter, categoryFilter]);

  // Real-time WebSocket updates
  useEffect(() => {
    if (!socket) return;

    const handleTicketCreated = (newTicket) => {
      setTickets((prev) => [newTicket, ...prev]);
    };

    const handleTicketUpdated = (updatedTicket) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === updatedTicket._id ? { ...t, ...updatedTicket } : t))
      );
    };

    const handleTicketActivity = ({ ticketId, message }) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? { ...t, status: t.status === 'Open' ? 'In Progress' : t.status } : t))
      );
    };

    socket.on('ticket_created', handleTicketCreated);
    socket.on('ticket_updated', handleTicketUpdated);
    socket.on('ticket_activity', handleTicketActivity);

    return () => {
      socket.off('ticket_created', handleTicketCreated);
      socket.off('ticket_updated', handleTicketUpdated);
      socket.off('ticket_activity', handleTicketActivity);
    };
  }, [socket]);

  const loadTickets = async () => {
    try {
      const res = await api.get('/tickets/my', {
        params: {
          status: statusFilter,
          category: categoryFilter,
        },
      });
      setTickets(res.data.data || []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBooks = async () => {
    try {
      const res = await api.get('/books/my');
      setBooks(res.data.data || []);
    } catch (err) {
      console.warn('Could not load books for modal:', err.message);
    }
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Support Tickets</h1>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live WebSocket Sync Active" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time communication with BookLeaf publishing operations and technical teams.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Raise New Ticket
        </button>
      </div>

      {/* Filter Tabs & Dropdowns */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading your tickets...</p>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No support tickets found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter !== 'All' || categoryFilter !== 'All'
              ? 'Try adjusting your filters above to see more tickets.'
              : 'Need help with royalties, book distribution, ISBNs, or author copies? Raise a ticket and get an instant AI-assisted response.'}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Raise Support Ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket._id}
              to={`/tickets/${ticket._id}`}
              className="block bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {ticket.ticket_number}
                    </span>
                    <StatusBadge status={ticket.status} />
                    <CategoryBadge category={ticket.category} />
                    <PriorityBadge priority={ticket.priority} size="xs" />
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    {ticket.subject}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2">{ticket.description}</p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right text-[11px] text-slate-400 space-y-0.5">
                    <div>
                      Book: <strong className="text-slate-700">{ticket.book_title}</strong>
                    </div>
                    <div>
                      Opened:{' '}
                      {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    {ticket.attachment && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <Paperclip className="w-3 h-3" /> 1 attachment
                      </div>
                    )}
                  </div>

                  <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-700 text-slate-400 flex items-center justify-center transition">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        books={books}
        onTicketCreated={() => loadTickets()}
      />
    </div>
  );
}

