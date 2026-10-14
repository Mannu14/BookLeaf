import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  BookOpen,
  DollarSign,
  ShoppingBag,
  ExternalLink,
  LifeBuoy,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

export default function AuthorsDirectory() {
  const [authors, setAuthors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadAuthors();
  }, []);

  const loadAuthors = async () => {
    try {
      const res = await api.get('/admin/authors');
      setAuthors(res.data.data || []);
    } catch (err) {
      console.error('Failed to load authors directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (author) => {
    try {
      await login(author.email, 'author123');
      navigate('/');
    } catch (err) {
      alert(`Could not log in as author: ${err.message}`);
    }
  };

  const filteredAuthors = authors.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.author_id.toLowerCase().includes(search.toLowerCase()) ||
      a.city?.toLowerCase().includes(search.toLowerCase())
  );

  const formatINR = (val) => (val ?? 0).toLocaleString('en-IN');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Loading authors catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Authors Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete registry of 10 pre-seeded authors and their publishing metrics.
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, city..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Authors Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAuthors.map((author) => (
          <div
            key={author.author_id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition space-y-4"
          >
            {/* Top Info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                  {author.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{author.name}</h3>
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      {author.author_id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> {author.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {author.city}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleImpersonate(author)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shadow-2xs transition shrink-0"
                title="Switch to this Author's View"
              >
                <span>Login As</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Metrics Snapshot */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400">Books</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">{author.booksCount}</div>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400">Sold</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">{formatINR(author.totalCopiesSold)}</div>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400">Earned</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">₹{formatINR(author.totalRoyaltyEarned)}</div>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400">Pending</div>
                <div className="text-xs font-bold text-amber-600 mt-0.5">₹{formatINR(author.royaltyPending)}</div>
              </div>
            </div>

            {/* Ticket Activity Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>
                Joined: {new Date(author.joined_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <LifeBuoy className="w-3 h-3 text-slate-400" />
                {author.ticketsCount} tickets ({author.openTicketsCount} open)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
