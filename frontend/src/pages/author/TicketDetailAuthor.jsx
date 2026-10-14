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
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  Shield,
  User,
  Sparkles,
  FileText,
} from 'lucide-react';

export default function TicketDetailAuthor() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, joinTicketRoom, leaveTicketRoom } = useSocket();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadTicket();
    joinTicketRoom(id);

    return () => {
      leaveTicketRoom(id);
    };
  }, [id]);

  // Real-time live message and ticket updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ ticketId, message }) => {
      if (ticketId === id) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      }
    };

    const handleTicketUpdated = (updated) => {
      if (updated._id === id) {
        setTicket((prev) => ({ ...prev, ...updated }));
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('ticket_updated', handleTicketUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('ticket_updated', handleTicketUpdated);
    };
  }, [socket, id]);

  const loadTicket = async () => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data.data.ticket);
      setMessages(res.data.data.messages || []);
    } catch (err) {
      setError(err.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await api.post(`/tickets/${id}/messages`, {
        message: replyText.trim(),
      });
      // Appended via socket or locally
      setMessages((prev) => {
        if (prev.some((m) => m._id === res.data.data._id)) return prev;
        return [...prev, res.data.data];
      });
      setReplyText('');
      scrollToBottom();
    } catch (err) {
      alert(`Error sending reply: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Connecting to live ticket session...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error || 'Ticket not found.'}</div>
        <Link to="/tickets" className="text-xs font-bold text-emerald-700 hover:underline">
          ← Back to Support Tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Session Active
        </div>
      </div>

      {/* Ticket Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {ticket.ticket_number}
            </span>
            <StatusBadge status={ticket.status} />
            <CategoryBadge category={ticket.category} />
            <PriorityBadge priority={ticket.priority} size="xs" />
          </div>

          <div className="text-xs text-slate-400">
            Opened on{' '}
            {new Date(ticket.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        <div>
          <h1 className="text-xl font-black text-slate-900">{ticket.subject}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Associated Book: <strong className="text-slate-800">{ticket.book_title}</strong>
          </p>
        </div>

        {ticket.attachment && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Attachment: {ticket.attachment.filename}</span>
            <span className="text-[10px] text-slate-400">({ticket.attachment.size} KB)</span>
          </div>
        )}
      </div>

      {/* Conversation Thread */}
      <div className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Conversation History
        </div>

        <div className="space-y-4">
          {messages.map((msg, index) => {
            const isAdminMessage = msg.sender_role === 'admin';
            return (
              <div
                key={msg._id || index}
                className={`flex gap-3.5 ${isAdminMessage ? 'justify-start' : 'justify-end'}`}
              >
                {isAdminMessage && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <Shield className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 shadow-xs space-y-1.5 ${
                    isAdminMessage
                      ? 'bg-white border border-indigo-100 text-slate-800'
                      : 'bg-emerald-700 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">
                        {isAdminMessage ? `${msg.sender_name} (BookLeaf Support)` : 'You'}
                      </span>
                      {isAdminMessage && msg.is_ai_drafted && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                          Official Verified Response
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] ${isAdminMessage ? 'text-slate-400' : 'text-emerald-200'}`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                </div>

                {!isAdminMessage && (
                  <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply Composer */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <form onSubmit={handleSendReply} className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Write a Reply
          </label>
          <textarea
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your response or follow-up question here..."
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Pressing Send pushes this response instantly to the BookLeaf operations queue.
            </span>

            <button
              type="submit"
              disabled={isSending || !replyText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send Reply
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
