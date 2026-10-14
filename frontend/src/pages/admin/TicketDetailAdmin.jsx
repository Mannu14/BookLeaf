import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import CategoryBadge from '../../components/CategoryBadge';
import {
  ArrowLeft,
  Sparkles,
  Send,
  Lock,
  UserCheck,
  RefreshCw,
  Copy,
  Check,
  Shield,
  User,
  BookOpen,
  DollarSign,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';

export default function TicketDetailAdmin() {
  const { id } = useParams();
  const { user: currentAdmin } = useAuth();
  const { socket, joinTicketRoom, leaveTicketRoom } = useSocket();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [internalNotes, setInternalNotes] = useState([]);
  const [authorContext, setAuthorContext] = useState(null);

  // Composer states
  const [replyText, setReplyText] = useState('');
  const [resolveOnSend, setResolveOnSend] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Internal Note state
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // AI draft state
  const [isRegeneratingDraft, setIsRegeneratingDraft] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadTicketData();
    joinTicketRoom(id);

    return () => {
      leaveTicketRoom(id);
    };
  }, [id]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ ticketId, message }) => {
      if (ticketId === id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    };

    const handleTicketUpdated = (updated) => {
      if (updated._id === id) {
        setTicket((prev) => ({ ...prev, ...updated }));
      }
    };

    const handleNewInternalNote = ({ ticketId, note }) => {
      if (ticketId === id) {
        setInternalNotes((prev) => {
          if (prev.some((n) => n._id === note._id)) return prev;
          return [...prev, note];
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('ticket_updated', handleTicketUpdated);
    socket.on('new_internal_note', handleNewInternalNote);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('ticket_updated', handleTicketUpdated);
      socket.off('new_internal_note', handleNewInternalNote);
    };
  }, [socket, id]);

  const loadTicketData = async () => {
    try {
      const res = await api.get(`/admin/tickets/${id}`);
      const data = res.data.data;
      setTicket(data.ticket);
      setMessages(data.messages || []);
      setInternalNotes(data.internalNotes || []);
      setAuthorContext(data.authorContext);

      // Pre-populate reply composer with AI draft if empty
      if (data.ticket?.ai_draft_response?.draft && !replyText) {
        setReplyText(data.ticket.ai_draft_response.draft);
      }
    } catch (err) {
      setError(err.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  // Status, Category & Priority overrides
  const handleUpdateTicket = async (updates) => {
    try {
      const res = await api.patch(`/admin/tickets/${id}`, updates);
      setTicket(res.data.data);
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  // Re-generate AI Draft
  const handleRegenerateDraft = async () => {
    setIsRegeneratingDraft(true);
    try {
      const res = await api.post(`/admin/tickets/${id}/ai-draft`);
      setTicket((prev) => ({ ...prev, ai_draft_response: res.data.data }));
      setReplyText(res.data.data.draft);
    } catch (err) {
      alert(`AI Draft failed: ${err.message}`);
    } finally {
      setIsRegeneratingDraft(false);
    }
  };

  // Send admin reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      const isDraftMatch = replyText.trim() === ticket?.ai_draft_response?.draft?.trim();

      const res = await api.post(`/admin/tickets/${id}/replies`, {
        message: replyText.trim(),
        isAIDrafted: isDraftMatch || Boolean(ticket?.ai_draft_response?.draft),
        resolveTicket: resolveOnSend,
      });

      setMessages((prev) => {
        if (prev.some((m) => m._id === res.data.data._id)) return prev;
        return [...prev, res.data.data];
      });

      if (resolveOnSend) {
        setTicket((prev) => ({ ...prev, status: 'Resolved' }));
      } else {
        setTicket((prev) => ({ ...prev, status: 'In Progress' }));
      }

      setReplyText('');
    } catch (err) {
      alert(`Error sending reply: ${err.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Add internal note
  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || isAddingNote) return;

    setIsAddingNote(true);
    try {
      const res = await api.post(`/admin/tickets/${id}/notes`, {
        note: newNoteText.trim(),
      });
      setInternalNotes((prev) => [...prev, res.data.data]);
      setNewNoteText('');
    } catch (err) {
      alert(`Failed to save note: ${err.message}`);
    } finally {
      setIsAddingNote(false);
    }
  };

  const copyDraftToClipboard = () => {
    if (ticket?.ai_draft_response?.draft) {
      navigator.clipboard.writeText(ticket.ai_draft_response.draft);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  const formatINR = (val) => (val ?? 0).toLocaleString('en-IN');

  const categoryOptions = [
    'Royalty & Payments',
    'ISBN & Metadata Issues',
    'Printing & Quality',
    'Distribution & Availability',
    'Book Status & Production Updates',
    'General Inquiry',
  ];

  const priorityOptions = ['Critical', 'High', 'Medium', 'Low'];
  const statusOptions = ['Open', 'In Progress', 'Resolved', 'Closed'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Loading admin ticket workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error || 'Ticket not found.'}</div>
        <Link to="/admin/tickets" className="text-xs font-bold text-indigo-700 hover:underline">
          ← Back to Ticket Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Top Header Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/tickets"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {ticket.ticket_number}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <CategoryBadge category={ticket.category} />
            </div>
            <h1 className="text-lg font-black text-slate-900 mt-1">{ticket.subject}</h1>
          </div>
        </div>

        {/* Action Controls: Assign to self & Status dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleUpdateTicket({ assignToSelf: true })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              ticket.assigned_to === currentAdmin?.id
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {ticket.assigned_to === currentAdmin?.id
              ? 'Assigned to You'
              : `Assign to Me (${currentAdmin?.name?.split(' ')[0]})`}
          </button>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span>Status:</span>
            <select
              value={ticket.status}
              onChange={(e) => handleUpdateTicket({ status: e.target.value })}
              className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 Cols): Context + Conversation + Reply Composer + Internal Notes */}
        <div className="lg:col-span-7 space-y-6">
          {/* Author & Book Context Snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                  {ticket.author_name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{ticket.author_name}</div>
                  <div className="text-[11px] text-slate-500">
                    {ticket.author_email} • {ticket.author?.city || 'India'}
                  </div>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="text-slate-400">Total Portfolio:</span>{' '}
                <strong className="text-slate-800">{authorContext?.totalBooks || 1} Books</strong>
              </div>
            </div>

            {/* Financial Rollup & Book Details */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Total Sold</span>
                <div className="font-bold text-slate-800">{formatINR(authorContext?.totalSold)} copies</div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Total Royalty</span>
                <div className="font-bold text-slate-800">₹{formatINR(authorContext?.totalEarned)}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Pending Royalty</span>
                <div className="font-bold text-amber-600">₹{formatINR(authorContext?.totalPending)}</div>
              </div>
            </div>

            {ticket.book && (
              <div className="pt-2 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-600">
                <div>
                  Book: <strong className="text-slate-900">{ticket.book.title}</strong>{' '}
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                    {ticket.book.isbn || 'No ISBN'}
                  </span>
                </div>
                <div>
                  Status:{' '}
                  <span className="font-semibold text-emerald-700">{ticket.book.status}</span>
                </div>
              </div>
            )}
          </div>

          {/* Public Conversation Thread */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Public Author Conversation
            </div>

            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isAdmin = msg.sender_role === 'admin';
                return (
                  <div
                    key={msg._id || index}
                    className={`flex gap-3.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isAdmin && (
                      <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <User className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-xl rounded-2xl p-4 shadow-xs space-y-1.5 ${
                        isAdmin
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">
                            {isAdmin ? `${msg.sender_name} (Admin Response)` : msg.sender_name}
                          </span>
                          {isAdmin && msg.is_ai_drafted && (
                            <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              AI Assisted
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] ${isAdmin ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                    </div>

                    {isAdmin && (
                      <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <Shield className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Admin Reply Composer */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>💬</span> Admin Response Composer
              </label>

              {ticket.ai_draft_response?.draft && (
                <button
                  type="button"
                  onClick={() => setReplyText(ticket.ai_draft_response.draft)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Insert AI Draft
                </button>
              )}
            </div>

            <textarea
              rows={6}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Review, edit, or customize the response before dispatching to the author..."
              className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resolveOnSend}
                  onChange={(e) => setResolveOnSend(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Automatically mark ticket as <strong>Resolved</strong> upon sending</span>
              </label>

              <button
                type="button"
                onClick={handleSendReply}
                disabled={isSendingReply || !replyText.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                {isSendingReply ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending to Author...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Response to Author
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Internal Private Notes Section (Admin Only) */}
          <div className="bg-amber-50/50 rounded-2xl border border-amber-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Internal Team Notes (Private to BookLeaf Admins)
              </h3>
              <span className="text-[10px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded font-semibold">
                Hidden from Author
              </span>
            </div>

            {/* Notes List */}
            {internalNotes.length > 0 && (
              <div className="space-y-2">
                {internalNotes.map((n, idx) => (
                  <div
                    key={n._id || idx}
                    className="p-3 bg-white rounded-xl border border-amber-200/60 shadow-2xs text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span className="font-bold text-slate-700">{n.author_name}</span>
                      <span>
                        {new Date(n.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-slate-800">{n.note}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Note Form */}
            <form onSubmit={handleAddInternalNote} className="space-y-2">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Log internal update (e.g. Spoke to accounts, verified bank IFSC)..."
                className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isAddingNote || !newNoteText.trim()}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-2xs transition disabled:opacity-50"
                >
                  {isAddingNote ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (5 Cols): AI Co-Pilot & Classification/Priority Overrides */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Co-Pilot Top Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/30 text-indigo-300 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <h2 className="text-sm font-extrabold tracking-tight">AI Operations Assistant</h2>
              </div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono border border-indigo-500/30">
                {ticket.ai_draft_response?.model_used || 'Gemini 1.5 Flash'}
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              Ticket was analyzed against BookLeaf’s knowledge base, financial logs, and SLA policies. Admins retain full override authority.
            </p>
          </div>

          {/* AI Auto-Classification Card & Override */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                AI Category Classification
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {Math.round((ticket.ai_classification?.confidence || 0.9) * 100)}% Confidence
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CategoryBadge category={ticket.category} />
              {ticket.ai_classification?.overridden && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                  Overridden by {ticket.ai_classification?.overridden_by || 'Admin'}
                </span>
              )}
            </div>

            {ticket.ai_classification?.reasoning && (
              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                "{ticket.ai_classification.reasoning}"
              </p>
            )}

            {/* Override Dropdown */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Admin Override Category:
              </label>
              <select
                value={ticket.category}
                onChange={(e) => handleUpdateTicket({ category: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AI Priority Scoring Card & Override */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                AI Priority Score
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {Math.round((ticket.ai_priority?.confidence || 0.88) * 100)}% Confidence
              </span>
            </div>

            <div className="flex items-center gap-2">
              <PriorityBadge priority={ticket.priority} />
              {ticket.ai_priority?.overridden && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                  Overridden by {ticket.ai_priority?.overridden_by || 'Admin'}
                </span>
              )}
            </div>

            {ticket.ai_priority?.reasoning && (
              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                "{ticket.ai_priority.reasoning}"
              </p>
            )}

            {/* Override Dropdown */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Admin Override Priority:
              </label>
              <select
                value={ticket.priority}
                onChange={(e) => handleUpdateTicket({ priority: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AI-Drafted Response Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  AI Suggested Response Draft
                </h3>
                <span className="text-[10px] text-slate-400">
                  Formulated from BookLeaf Knowledge Base
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={copyDraftToClipboard}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Copy Draft"
                >
                  {copiedDraft ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateDraft}
                  disabled={isRegeneratingDraft}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                  title="Re-generate Draft"
                >
                  <RefreshCw className={`w-4 h-4 ${isRegeneratingDraft ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 max-h-64 overflow-y-auto text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
              {ticket.ai_draft_response?.draft || 'No AI draft available.'}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              <span>Tokens: ~{ticket.ai_draft_response?.token_estimate || 350}</span>
              <button
                type="button"
                onClick={() => setReplyText(ticket.ai_draft_response?.draft || '')}
                className="text-indigo-600 hover:text-indigo-800 font-bold"
              >
                Use this Draft in Composer →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

