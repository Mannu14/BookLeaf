import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { ACTIVE_STATUSES } from '../../lib/constants';
import { dateTime } from '../../lib/format';
import { Card, Skeleton } from '../../components/ui';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../../components/badges';
import MessageItem from '../../components/MessageItem';
import ReplyComposer from './workspace/ReplyComposer';
import { AuthorPanel, ManagePanel, NotesPanel, TriagePanel } from './workspace/SidePanels';

export default function TicketWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [team, setTeam] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const autoDrafted = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/tickets/${id}`);
      setData(res.data.data);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    autoDrafted.current = false;
    setData(null);
    load();
    api.get('/admin/team').then((res) => setTeam(res.data.data));
  }, [load]);

  const patchTicket = (patch) => setData((d) => d && { ...d, ticket: { ...d.ticket, ...patch, book: d.ticket.book } });

  const generateDraft = useCallback(async () => {
    setDrafting(true);
    try {
      const res = await api.post(`/admin/tickets/${id}/draft`);
      patchTicket({ ai_draft: res.data.data });
    } catch (err) {
      toast.error('Could not draft a reply', err.message);
    } finally {
      setDrafting(false);
    }
  }, [id, toast]);

  // Drafts are generated lazily: the first time an admin opens an active
  // ticket, or when the existing draft predates the author's latest message.
  useEffect(() => {
    if (!data || autoDrafted.current) return;
    const { ticket } = data;
    autoDrafted.current = true;
    if (ACTIVE_STATUSES.includes(ticket.status) && (!ticket.ai_draft?.text || ticket.ai_draft.stale)) {
      generateDraft();
    }
  }, [data, generateDraft]);

  useSocketEvent('message:created', ({ ticketId, message }) => {
    if (ticketId !== id) return;
    setData((d) => d && (d.messages.some((m) => m._id === message._id) ? d : { ...d, messages: [...d.messages, message] }));
  });
  useSocketEvent('ticket:updated', (t) => t._id === id && patchTicket(t));
  useSocketEvent('note:created', ({ ticketId, note }) => {
    if (ticketId !== id) return;
    setData((d) => d && (d.notes.some((n) => n._id === note._id) ? d : { ...d, notes: [...d.notes, note] }));
  });
  useSocketEvent('draft:ready', ({ ticketId, draft }) => ticketId === id && patchTicket({ ai_draft: draft }));

  const update = async (changes) => {
    setBusy(true);
    try {
      const res = await api.patch(`/admin/tickets/${id}`, changes);
      patchTicket(res.data.data);
      return true;
    } catch (err) {
      toast.error('Update failed', err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (payload) => {
    try {
      const res = await api.post(`/admin/tickets/${id}/replies`, payload);
      const { message, ticket } = res.data.data;
      setData((d) => ({
        ...d,
        ticket: { ...d.ticket, ...ticket, book: d.ticket.book },
        messages: d.messages.some((m) => m._id === message._id) ? d.messages : [...d.messages, message],
      }));
      toast.success('Reply sent', payload.resolve ? 'Ticket marked as resolved.' : 'The author can see it now.');
      return true;
    } catch (err) {
      toast.error('Reply not sent', err.message);
      return false;
    }
  };

  const addNote = async (note) => {
    try {
      const res = await api.post(`/admin/tickets/${id}/notes`, { note });
      setData((d) => (d.notes.some((n) => n._id === res.data.data._id) ? d : { ...d, notes: [...d.notes, res.data.data] }));
      return true;
    } catch (err) {
      toast.error('Note not saved', err.message);
      return false;
    }
  };

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-clay-700">{error}</p>
        <Link to="/admin" className="link mt-3 inline-block text-[13px]">
          Back to queue
        </Link>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const { ticket, messages, notes, author_context: authorContext } = data;

  return (
    <>
      <Link to="/admin" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Queue
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12px] text-ink-muted">{ticket.ticket_number}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <CategoryBadge category={ticket.category} />
            </div>
            <h1 className="mt-3 font-display text-[28px] leading-tight">{ticket.subject}</h1>
            <p className="mt-2 text-[13px] text-ink-muted">
              {ticket.author_name} · {ticket.book_title} · {dateTime(ticket.created_at)}
            </p>
            {ticket.attachment && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1 text-[12px] text-ink-soft">
                <FileText className="h-3.5 w-3.5" /> {ticket.attachment.original_name}
                <span className="text-ink-faint">{ticket.attachment.size_kb} KB</span>
              </p>
            )}
          </header>

          <ol className="space-y-4">
            {messages.map((m) => (
              <MessageItem key={m._id} message={m} mine={m.sender_role === 'admin'} viewer="admin" />
            ))}
          </ol>

          <ReplyComposer ticket={ticket} drafting={drafting} onRegenerate={generateDraft} onSend={sendReply} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <ManagePanel ticket={ticket} team={team} me={user} onUpdate={update} busy={busy} />
          <TriagePanel ticket={ticket} onUpdate={update} busy={busy} />
          <AuthorPanel context={authorContext} ticketBookId={ticket.book?._id} />
          <NotesPanel notes={notes} onAdd={addNote} />
        </aside>
      </div>
    </>
  );
}
