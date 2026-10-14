import { useEffect, useState } from 'react';
import { BookOpen, MessageSquarePlus } from 'lucide-react';
import { api } from '../../lib/api';
import { date, inr, number } from '../../lib/format';
import { PAYOUT_THRESHOLD, PRODUCTION_STAGES } from '../../lib/constants';
import { Button, Card, EmptyState, PageHeader, Skeleton } from '../../components/ui';
import { BookStatusBadge } from '../../components/badges';
import BookSpine from '../../components/BookSpine';
import NewTicketModal from './NewTicketModal';
import { cn } from '../../lib/cn';

export default function MyBooks() {
  const [books, setBooks] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [ticketFor, setTicketFor] = useState(undefined); // undefined = closed, null = general, id = book

  useEffect(() => {
    api
      .get('/books')
      .then((res) => {
        setBooks(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="My books"
        description={meta ? `${meta.published} live, ${meta.in_production} in production. Figures update after each quarterly royalty run.` : ' '}
        actions={
          <Button variant="secondary" icon={MessageSquarePlus} onClick={() => setTicketFor(null)}>
            Ask about a book
          </Button>
        }
      />

      {error && <Card className="p-5 text-clay-700">{error}</Card>}

      {!books && !error && (
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      )}

      {books?.length === 0 && (
        <Card>
          <EmptyState icon={BookOpen} title="No books yet" description="Once your manuscript is received it will appear here with its production status." />
        </Card>
      )}

      <div className="space-y-5">
        {books?.map((book, i) => (
          <BookCard key={book._id} book={book} style={{ animationDelay: `${i * 60}ms` }} onAsk={() => setTicketFor(book._id)} />
        ))}
      </div>

      <NewTicketModal open={ticketFor !== undefined} onClose={() => setTicketFor(undefined)} books={books || []} defaultBookId={ticketFor} />
    </>
  );
}

function BookCard({ book, onAsk, style }) {
  const live = book.is_published;

  return (
    <Card className="animate-fade-up overflow-hidden" style={style}>
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
        <BookSpine title={book.title} live={live} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[22px] leading-tight">{book.title}</h2>
              <p className="mt-1 text-[13px] text-ink-muted">
                {book.genre} · <span className="font-mono text-[12px]">{book.book_id}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <BookStatusBadge status={book.status} />
              <Button size="sm" variant="ghost" onClick={onAsk}>
                Ask about this book
              </Button>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-[13px] sm:grid-cols-4">
            <Detail label="ISBN" value={book.isbn ? <span className="font-mono text-[12px]">{book.isbn}</span> : 'Assigned during production'} />
            <Detail label="Published" value={book.publication_date ? date(book.publication_date) : 'Not yet'} />
            <Detail label="MRP" value={book.mrp != null ? inr(book.mrp) : 'Set before printing'} />
            <Detail label="Print partner" value={book.print_partner || '—'} />
          </dl>
        </div>
      </div>

      {live ? (
        <>
          <div className="grid grid-cols-2 border-t border-line bg-paper/50 sm:grid-cols-5">
            <Figure label="Copies sold" value={number(book.total_copies_sold)} />
            <Figure label="Royalty / copy" value={inr(book.author_royalty_per_copy)} />
            <Figure label="Total earned" value={inr(book.total_royalty_earned)} />
            <Figure label="Paid" value={inr(book.royalty_paid)} />
            <Figure
              label="Pending"
              value={inr(book.royalty_pending)}
              tone={book.royalty_pending > 0 ? 'text-ochre-600' : ''}
              note={
                book.royalty_pending === 0
                  ? 'All paid'
                  : book.royalty_pending < PAYOUT_THRESHOLD
                    ? 'Below ₹1,000, rolls over'
                    : null
              }
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-5 py-3 text-[13px] sm:px-6">
            <span className="text-ink-muted">
              Last payout: <span className="text-ink">{book.last_royalty_payout_date ? date(book.last_royalty_payout_date) : 'No payout yet'}</span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-ink-muted">Available on</span>
              {book.available_on.map((c) => (
                <span key={c} className="rounded border border-line bg-white px-1.5 py-px text-[12px]">
                  {c}
                </span>
              ))}
            </span>
          </div>
        </>
      ) : (
        <ProductionTrack status={book.status} />
      )}
    </Card>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}

function Figure({ label, value, tone, note }) {
  return (
    <div className="border-line px-5 py-4 last:col-span-2 sm:px-6 sm:last:col-span-1 sm:[&:not(:last-child)]:border-r">
      <p className="eyebrow">{label}</p>
      <p className={cn('num mt-1.5 font-display text-[20px]', tone)}>{value}</p>
      {note && <p className="mt-0.5 text-[12px] text-ink-muted">{note}</p>}
    </div>
  );
}

// Books in production show where they are in the pipeline instead of empty royalty numbers.
function ProductionTrack({ status }) {
  const stage = status.replace(/^In Production - /, '');
  const current = Math.max(0, PRODUCTION_STAGES.indexOf(stage));

  return (
    <div className="border-t border-line bg-paper/50 px-5 py-5 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[13px]">
          Currently in <strong className="font-semibold">{stage}</strong>
        </p>
        <p className="text-[12px] text-ink-muted">Royalties start once the book is live</p>
      </div>
      <ol className="mt-4 grid grid-cols-9 gap-1">
        {PRODUCTION_STAGES.map((s, i) => (
          <li key={s} className="group relative">
            <div className={cn('h-1.5 rounded-full', i < current ? 'bg-leaf-500' : i === current ? 'bg-ochre-500' : 'bg-line-strong')} />
            <span
              className={cn(
                'mt-2 hidden text-[11px] leading-tight lg:block',
                i === current ? 'font-medium text-ink' : 'text-ink-faint'
              )}
            >
              {s}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
