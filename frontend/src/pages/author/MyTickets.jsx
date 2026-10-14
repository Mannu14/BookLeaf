import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MessageSquarePlus, MessagesSquare, Paperclip } from 'lucide-react';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../context/SocketContext';
import { ago, date } from '../../lib/format';
import { STATUSES } from '../../lib/constants';
import { Button, Card, EmptyState, PageHeader, Skeleton, Tabs } from '../../components/ui';
import { CategoryBadge, StatusBadge } from '../../components/badges';
import NewTicketModal from './NewTicketModal';
import { cn } from '../../lib/cn';

export default function MyTickets() {
  const [tickets, setTickets] = useState(null);
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    api.get('/tickets').then((res) => setTickets(res.data.data));
    api.get('/books').then((res) => setBooks(res.data.data));
  }, []);

  // Live: status changes and new replies reorder the list without a refresh.
  useSocketEvent('ticket:updated', (t) => {
    setTickets((list) => {
      if (!list) return list;
      const rest = list.filter((x) => x._id !== t._id);
      return [t, ...rest];
    });
    setFlash(t._id);
  });
  useSocketEvent('ticket:created', (t) => setTickets((list) => (list && !list.some((x) => x._id === t._id) ? [t, ...list] : list)));

  const counts = useMemo(() => {
    const c = { All: tickets?.length || 0 };
    for (const s of STATUSES) c[s] = tickets?.filter((t) => t.status === s).length || 0;
    return c;
  }, [tickets]);

  const visible = tickets?.filter((t) => status === 'All' || t.status === status) || [];

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Your tickets"
        description="Replies from the BookLeaf team appear here as soon as they are sent."
        actions={
          <Button icon={MessageSquarePlus} onClick={() => setModalOpen(true)}>
            Raise a query
          </Button>
        }
      />

      <div className="mb-4 overflow-x-auto">
        <Tabs value={status} onChange={setStatus} options={['All', ...STATUSES].map((s) => ({ value: s, label: s, count: counts[s] }))} />
      </div>

      <Card>
        {!tickets ? (
          <div className="space-y-px p-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-[72px]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title={status === 'All' ? 'No tickets yet' : `No ${status.toLowerCase()} tickets`}
            description={status === 'All' ? 'If something is not right with your royalties, ISBN, printing or listings, let us know.' : 'Try another filter.'}
            action={
              status === 'All' && (
                <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
                  Raise a query
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((t) => (
              <li key={t._id} className={cn(flash === t._id && 'animate-flash')} onAnimationEnd={() => setFlash(null)}>
                <Link to={`/tickets/${t._id}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-paper">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', t.unread_for_author ? 'bg-leaf-500' : 'bg-transparent')} title={t.unread_for_author ? 'New reply' : undefined} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className={cn('truncate', t.unread_for_author ? 'font-semibold' : 'font-medium')}>{t.subject}</p>
                      {t.attachment && <Paperclip className="h-3.5 w-3.5 text-ink-faint" />}
                    </div>
                    <p className="mt-1 text-[12px] text-ink-muted">
                      <span className="font-mono">{t.ticket_number}</span> · {t.book_title} · opened {date(t.created_at)}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <CategoryBadge category={t.category} short />
                  </div>
                  <div className="flex w-28 flex-col items-end gap-1">
                    <StatusBadge status={t.status} />
                    <span className="text-[11px] text-ink-faint">{ago(t.last_activity_at)}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <NewTicketModal open={modalOpen} onClose={() => setModalOpen(false)} books={books} />
    </>
  );
}
