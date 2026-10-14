import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import NewTicketModal from './NewTicketModal';
import {
  DollarSign,
  BookOpen,
  ShoppingBag,
  LifeBuoy,
  PlusCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function AuthorDashboard() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [booksRes, ticketsRes] = await Promise.all([
        api.get('/books/my'),
        api.get('/tickets/my'),
      ]);
      setBooks(booksRes.data.data || []);
      setSummary(booksRes.data.summary || {});
      setRecentTickets(ticketsRes.data.data?.slice(0, 3) || []);
    } catch (err) {
      console.error('Failed to load author dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading author dashboard...</p>
        </div>
      </div>
    );
  }

  const formatINR = (val) => (val ?? 0).toLocaleString('en-IN');
  const meetsThreshold = (summary?.royaltyPending ?? 0) >= 1000;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Welcome & Action Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
              <span>Author Portal</span> • {user?.author_id}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Track your publication milestones, real-time royalties, and get AI-assisted 24/7 support from the BookLeaf team.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition"
            >
              <PlusCircle className="w-4 h-4" />
              Raise Support Ticket
            </button>
            <Link
              to="/books"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition"
            >
              <BookOpen className="w-4 h-4" />
              View All Books
            </Link>
          </div>
        </div>

        {/* Ambient background blur */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Royalty Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earned */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Earned</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{formatINR(summary?.totalRoyaltyEarned)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Lifetime royalty from all published books (80/20 split)
          </p>
        </div>

        {/* Royalty Paid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Royalty Paid</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{formatINR(summary?.royaltyPaid)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Disbursed via direct bank transfer</p>
        </div>

        {/* Royalty Pending */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Royalty Pending</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            ₹{formatINR(summary?.royaltyPending)}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                meetsThreshold ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {meetsThreshold ? '✓ Payout Eligible (>₹1k)' : 'Rolls over (<₹1k threshold)'}
            </span>
          </div>
        </div>

        {/* Total Sold */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Copies Sold</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatINR(summary?.totalCopiesSold)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {summary?.publishedBooks || 0} live titles on Amazon & Flipkart
          </p>
        </div>
      </div>

      {/* Two Column Section: Books & Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): My Books Overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Books</h2>
              <p className="text-xs text-slate-500">Your published titles and books in production</p>
            </div>
            <Link
              to="/books"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Detailed Breakdown <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            {books.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No books found.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {books.map((book) => {
                  const isInProduction = book.status.startsWith('In Production');
                  return (
                    <div
                      key={book.book_id}
                      className="p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-14 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                            isInProduction
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          📖
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            {book.title}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isInProduction
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {book.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                            <span>ISBN: {book.isbn || 'Pending Assignment'}</span>
                            <span>Genre: {book.genre}</span>
                            {book.mrp && <span>MRP: ₹{book.mrp}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 sm:text-right shrink-0">
                        <div>
                          <div className="text-xs text-slate-400">Sold</div>
                          <div className="text-sm font-bold text-slate-800">
                            {book.total_copies_sold} copies
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">Pending Royalty</div>
                          <div className="text-sm font-black text-amber-600">
                            ₹{formatINR(book.royalty_pending)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Recent Tickets & Policies */}
        <div className="space-y-6">
          {/* Recent Tickets Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Support Tickets</h3>
                <p className="text-[11px] text-slate-500">Live communication with admin team</p>
              </div>
              <Link
                to="/tickets"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                View All
              </Link>
            </div>

            {recentTickets.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                You have not submitted any tickets yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentTickets.map((ticket) => (
                  <Link
                    key={ticket._id}
                    to={`/tickets/${ticket._id}`}
                    className="block p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono text-slate-400">
                        {ticket.ticket_number}
                      </span>
                      <StatusBadge status={ticket.status} size="xs" />
                    </div>
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {ticket.subject}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>{ticket.book_title}</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              New Ticket
            </button>
          </div>

          {/* BookLeaf Policy Quick Reference Card */}
          <div className="bg-emerald-50/70 rounded-2xl border border-emerald-100 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <span>📌</span> BookLeaf Royalty Policy
            </h4>
            <ul className="text-xs text-emerald-950/80 space-y-2 list-disc list-inside">
              <li>
                <strong>80/20 Net Profit:</strong> 80% to you, 20% to BookLeaf after marketplace & print costs.
              </li>
              <li>
                <strong>Quarterly Schedule:</strong> Disbursed within 45 days after quarter close.
              </li>
              <li>
                <strong>₹1,000 Payout Rule:</strong> Balances under ₹1,000 carry forward to the next quarter.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        books={books}
        onTicketCreated={() => loadDashboardData()}
      />
    </div>
  );
}
