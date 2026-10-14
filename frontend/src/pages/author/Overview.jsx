import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarClock, MessageSquarePlus, MessagesSquare } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent } from '../../context/SocketContext';
import { date, ago, inr, number, firstName } from '../../lib/format';
import { nextPayout, PAYOUT_THRESHOLD } from '../../lib/constants';
import { Button, Card, CardHeader, EmptyState, PageHeader, Skeleton, Stat } from '../../components/ui';
import { BookStatusBadge, StatusBadge } from '../../components/badges';
import BookSpine from '../../components/BookSpine';
import NewTicketModal from './NewTicketModal';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function Overview() {
  const { user } = useAuth();
  const [books, setBooks] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    api.get('/books').then((res) => {
      setBooks(res.data.data);
      setMeta(res.data.meta);
    });
    api.get('/tickets').then((res) => setTickets(res.data.data));
  }, []);

  useSocketEvent('ticket:updated', (t) => setTickets((list) => list?.map((x) => (x._id === t._id ? t : x))));

  const payout = nextPayout();
  const pending = meta?.royalty_pending ?? 0;
  const activeTickets = tickets?.filter((t) => ['Open', 'In Progress'].includes(t.status)) || [];

  return (
    <>
      <PageHeader
        eyebrow={date(new Date())}
        title={`${greeting()}, ${firstName(user?.name)}`}
        description="Your books, royalties and conversations with the BookLeaf team in one place."
        actions={
          <Button icon={MessageSquarePlus} onClick={() => setModalOpen(true)}>
            Raise a query
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {meta ? (
          <>
            <Stat label="Royalty earned" value={inr(meta.royalty_earned)} hint={`Across ${meta.published} live title${meta.published === 1 ? '' : 's'}`} />
            <Stat label="Paid out" value={inr(meta.royalty_paid)} hint="By bank transfer" />
            <Stat
              label="Pending"
              value={inr(pending)}
              tone={pending > 0 ? 'ochre' : undefined}
              hint={pending === 0 ? 'Nothing outstanding' : pending < PAYOUT_THRESHOLD ? `Below the ₹1,000 payout threshold, rolls over` : 'Eligible for the next payout'}
            />
            <Stat label="Copies sold" value={number(meta.copies_sold)} hint={`${meta.total} book${meta.total === 1 ? '' : 's'} with BookLeaf`} />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[118px] rounded-xl" />)
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-leaf-100 bg-leaf-50/60 px-5 py-4 sm:flex-row sm:items-center">
        <CalendarClock className="h-5 w-5 shrink-0 text-leaf-600" />
        <p className="text-[14px] text-leaf-800">
          Next payout: <strong className="font-semibold">{payout.quarter}</strong> royalties are paid by{' '}
          <strong className="font-semibold">{date(payout.deadline)}</strong>. Royalties are calculated quarterly and paid within 45 days of the quarter
          ending.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Your books" action={<Link to="/books" className="link text-[13px]">View details</Link>} />
          {!books ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : books.length === 0 ? (
            <EmptyState title="No books yet" description="Books you publish with BookLeaf will show up here." />
          ) : (
            <ul className="divide-y divide-line">
              {books.map((b) => (
                <li key={b._id} className="flex items-center gap-4 px-5 py-3.5">
                  <BookSpine title={b.title} live={b.is_published} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{b.title}</p>
                    <p className="text-[13px] text-ink-muted">{b.genre}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="num text-[13px]">{b.is_published ? `${number(b.total_copies_sold)} sold` : '—'}</p>
                    <p className="num text-[12px] text-ink-muted">{b.is_published ? `${inr(b.royalty_pending)} pending` : 'Not live yet'}</p>
                  </div>
                  <BookStatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Open conversations"
            description={tickets ? `${activeTickets.length} active` : ' '}
            action={<Link to="/tickets" className="link text-[13px]">All tickets</Link>}
          />
          {!tickets ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="No queries yet"
              description="Questions about royalties, ISBNs, printing or listings? We usually reply within a working day."
              action={
                <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
                  Raise a query
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {tickets.slice(0, 5).map((t) => (
                <li key={t._id}>
                  <Link to={`/tickets/${t._id}`} className="group flex items-start gap-3 px-5 py-3.5 transition hover:bg-paper">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {t.unread_for_author && <span className="h-2 w-2 shrink-0 rounded-full bg-leaf-500" title="New reply" />}
                        <p className="truncate font-medium">{t.subject}</p>
                      </div>
                      <p className="mt-0.5 text-[12px] text-ink-muted">
                        {t.ticket_number} · {ago(t.last_activity_at)}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <NewTicketModal open={modalOpen} onClose={() => setModalOpen(false)} books={books || []} />
    </>
  );
}
