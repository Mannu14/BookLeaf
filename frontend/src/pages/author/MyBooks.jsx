import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import NewTicketModal from './NewTicketModal';
import {
  BookOpen,
  Calendar,
  DollarSign,
  Tag,
  ShoppingBag,
  ExternalLink,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function MyBooks() {
  const [books, setBooks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBookForTicket, setSelectedBookForTicket] = useState(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/books/my');
      setBooks(res.data.data || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicketForBook = (book) => {
    setSelectedBookForTicket(book._id);
    setIsTicketModalOpen(true);
  };

  const formatINR = (val) => (val ?? 0).toLocaleString('en-IN');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading your book catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Books & Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track publication statuses, distribution channels, and line-item royalty earnings.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedBookForTicket(null);
            setIsTicketModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Submit a Query
        </button>
      </div>

      {/* Books Grid */}
      <div className="space-y-6">
        {books.map((book) => {
          const isInProduction = book.status.startsWith('In Production');
          const isPublished = book.status === 'Published & Live';

          return (
            <div
              key={book.book_id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition overflow-hidden"
            >
              {/* Card Top Banner */}
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-20 rounded-xl flex flex-col items-center justify-center font-bold text-xs shrink-0 shadow-sm border ${
                      isInProduction
                        ? 'bg-amber-100 text-amber-900 border-amber-200'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                    }`}
                  >
                    <BookOpen className="w-6 h-6 mb-1" />
                    <span className="text-[9px] uppercase font-mono">{book.book_id}</span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-lg font-extrabold text-slate-900">{book.title}</h2>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          isInProduction
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        }`}
                      >
                        {book.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        <strong className="text-slate-700">ISBN:</strong>{' '}
                        {book.isbn ? (
                          <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">
                            {book.isbn}
                          </code>
                        ) : (
                          <span className="italic text-slate-400">Assigned during production</span>
                        )}
                      </span>
                      <span>
                        <strong className="text-slate-700">Genre:</strong> {book.genre}
                      </span>
                      <span>
                        <strong className="text-slate-700">Published:</strong>{' '}
                        {book.publication_date
                          ? new Date(book.publication_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Pending Release'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenTicketForBook(book)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    Query this Book
                  </button>
                </div>
              </div>

              {/* Card Body: Financials & Distribution */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Financial Summary */}
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pricing & Royalty Rate
                  </div>
                  <div className="text-base font-bold text-slate-800">
                    {book.mrp ? `MRP ₹${book.mrp}` : 'MRP Not Fixed'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Author Share: {book.author_royalty_per_copy ? `₹${book.author_royalty_per_copy}/copy` : 'Calculated on net profit'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sales Volume
                  </div>
                  <div className="text-base font-black text-slate-900">
                    {formatINR(book.total_copies_sold)} copies
                  </div>
                  <div className="text-xs text-slate-500">
                    {book.total_copies_sold === 0 ? 'No sales recorded yet' : 'Verified net marketplace sales'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Royalty Balance
                  </div>
                  <div className="text-base font-black text-amber-600">
                    Pending: ₹{formatINR(book.royalty_pending)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Earned: ₹{formatINR(book.total_royalty_earned)} • Paid: ₹{formatINR(book.royalty_paid)}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Last Payout Date
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {book.last_royalty_payout_date
                      ? new Date(book.last_royalty_payout_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'No payouts disbursed yet'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Print Partner: {book.print_partner || 'In-House'}
                  </div>
                </div>
              </div>

              {/* Retail Distribution Channels */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Retail Channels:</span>
                  {book.available_on && book.available_on.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {book.available_on.map((channel) => (
                        <span
                          key={channel}
                          className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-slate-700 shadow-2xs"
                        >
                          {channel}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="italic text-slate-400">
                      {isInProduction ? 'Distribution channels activated after live printing' : 'Offline / In-House'}
                    </span>
                  )}
                </div>

                {isPublished && (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Marketplace Feeds Active
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        books={books}
        initialBookId={selectedBookForTicket}
        onTicketCreated={() => loadBooks()}
      />
    </div>
  );
}
