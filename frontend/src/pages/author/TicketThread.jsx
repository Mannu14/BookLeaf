import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { dateTime } from '../../lib/format';
import { Button, Card, Skeleton, Textarea } from '../../components/ui';
import { CategoryBadge, StatusBadge } from '../../components/badges';
import MessageItem from '../../components/MessageItem';

export default function TicketThread() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef(null);

  const load = useCallback(
    () =>
      api
        .get(`/tickets/${id}`)
        .then((res) => {
          setTicket(res.data.data.ticket);
          setMessages(res.data.data.messages);
        })
        .catch((err) => setError(err.message)),
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  useSocketEvent('message:created', ({ ticketId, message }) => {
    if (ticketId !== id) return;
    setMessages((list) => (list.some((m) => m._id === message._id) ? list : [...list, message]));
    // Re-fetch so the server marks the new reply as read while we are looking at it.
    if (message.sender_role === 'admin') load();
  });
  useSocketEvent('ticket:updated', (t) => t._id === id && setTicket(t));

  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/tickets/${id}/messages`, { body: reply.trim() });
      setMessages((list) => (list.some((m) => m._id === res.data.data._id) ? list : [...list, res.data.data]));
      setReply('');
    } catch (err) {
      toast.error('Message not sent', err.message);
    } finally {
      setSending(false);
    }
  };

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-clay-700">{error}</p>
        <Link to="/tickets" className="link mt-3 inline-block text-[13px]">
          Back to tickets
        </Link>
      </Card>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const closed = ticket.status === 'Closed';

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/tickets" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All tickets
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12px] text-ink-muted">{ticket.ticket_number}</span>
          <StatusBadge status={ticket.status} />
          <CategoryBadge category={ticket.category} />
        </div>
        <h1 className="mt-3 font-display text-[28px] leading-tight">{ticket.subject}</h1>
        <p className="mt-2 text-[13px] text-ink-muted">
          {ticket.book_title} · opened {dateTime(ticket.created_at)}
        </p>
        {ticket.attachment && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1 text-[12px] text-ink-soft">
            <FileText className="h-3.5 w-3.5" /> {ticket.attachment.original_name}
            <span className="text-ink-faint">{ticket.attachment.size_kb} KB</span>
          </p>
        )}
      </header>

      <ol className="relative space-y-4">
        {messages.map((m) => (
          <MessageItem key={m._id} message={m} mine={m.sender_role === 'author'} viewer="author" />
        ))}
        {ticket.status === 'Open' && messages.length === 1 && (
          <li className="rounded-xl border border-dashed border-line-strong px-5 py-4 text-[13px] text-ink-muted">
            Your query is with the BookLeaf support team. You will see their reply here, and it will appear without refreshing the page.
          </li>
        )}
      </ol>
      <div ref={bottom} />

      <Card className="mt-6 p-4">
        {closed ? (
          <p className="text-[13px] text-ink-muted">This ticket is closed. If you still need help, please raise a new query.</p>
        ) : (
          <form onSubmit={send} className="space-y-3">
            <Textarea
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={`Reply as ${user?.name}...`}
              maxLength={5000}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e);
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-ink-faint">
                {ticket.status === 'Resolved' ? 'Replying will reopen this ticket.' : 'Ctrl + Enter to send'}
              </p>
              <Button type="submit" size="sm" icon={Send} loading={sending} disabled={!reply.trim()}>
                Send
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
