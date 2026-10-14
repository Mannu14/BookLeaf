import { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Avatar, Button, Card, CardHeader, Select, Textarea } from '../../../components/ui';
import { BookStatusBadge } from '../../../components/badges';
import { CATEGORIES, PRIORITIES, STATUSES } from '../../../lib/constants';
import { ago, date, dateTime, inr, number } from '../../../lib/format';
import { cn } from '../../../lib/cn';

export function ManagePanel({ ticket, team, me, onUpdate, busy }) {
  const assignedToMe = String(ticket.assigned_to) === String(me?.id);
  return (
    <Card>
      <CardHeader title="Ticket" />
      <div className="space-y-4 p-5">
        <Row label="Status">
          <Select size="sm" value={ticket.status} onChange={(e) => onUpdate({ status: e.target.value })} disabled={busy}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Row>
        <Row label="Assignee">
          <div className="flex items-center gap-2">
            <Select
              size="sm"
              className="min-w-0"
              value={ticket.assigned_to || ''}
              onChange={(e) => onUpdate({ assignee: e.target.value || null })}
              disabled={busy}
            >
              <option value="">Unassigned</option>
              {team.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {String(a.id) === String(me?.id) ? ' (you)' : ''}
                </option>
              ))}
            </Select>
            {!assignedToMe && (
              <Button size="sm" variant="secondary" onClick={() => onUpdate({ assignee: 'me' })} disabled={busy}>
                Take it
              </Button>
            )}
          </div>
        </Row>
        <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-[12px]">
          <Meta label="Opened" value={dateTime(ticket.created_at)} />
          <Meta label="First response" value={ticket.first_response_at ? ago(ticket.first_response_at) : 'Not yet'} />
          <Meta label="Last activity" value={ago(ticket.last_activity_at)} />
          <Meta label="Resolved" value={ticket.resolved_at ? date(ticket.resolved_at) : '—'} />
        </dl>
      </div>
    </Card>
  );
}

export function TriagePanel({ ticket, onUpdate, busy }) {
  const meta = ticket.ai_triage_meta || {};
  const source = meta.source === 'fallback' ? 'Rule-based (AI unavailable)' : `${meta.model || 'AI'}`;
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-leaf-600" /> AI triage
          </span>
        }
        description={`${source}${meta.latency_ms ? ` · ${(meta.latency_ms / 1000).toFixed(1)}s` : ''}`}
      />
      <div className="space-y-5 p-5">
        <Suggestion label="Category" field="category" options={CATEGORIES} ticket={ticket} onUpdate={onUpdate} busy={busy} />
        <Suggestion label="Priority" field="priority" options={PRIORITIES} ticket={ticket} onUpdate={onUpdate} busy={busy} />
      </div>
    </Card>
  );
}

function Suggestion({ label, field, options, ticket, onUpdate, busy }) {
  const ai = ticket[`ai_${field}`] || {};
  const overridden = ai.overridden;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-soft">{label}</span>
        {ai.confidence != null && !overridden && <span className="num text-[12px] text-ink-faint">{Math.round(ai.confidence * 100)}% confident</span>}
        {overridden && <span className="text-[12px] text-ochre-700">Changed by {ai.overridden_by?.split(' ')[0]}</span>}
      </div>
      <Select size="sm" value={ticket[field]} onChange={(e) => onUpdate({ [field]: e.target.value })} disabled={busy}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </Select>
      {ai.reasoning && (
        <p className={cn('mt-2 text-[12px] leading-relaxed', overridden ? 'text-ink-faint' : 'text-ink-muted')}>
          {overridden && <span className="font-medium">AI suggested {ai.value}. </span>}
          {ai.reasoning}
        </p>
      )}
    </div>
  );
}

export function AuthorPanel({ context, ticketBookId }) {
  if (!context) return null;
  const { author, totals, books, open_tickets: openTickets } = context;
  return (
    <Card>
      <CardHeader title="Author" />
      <div className="p-5">
        <div className="flex items-center gap-3">
          <Avatar name={author?.name} />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-medium">{author?.name}</p>
            <p className="truncate text-[12px] text-ink-muted">
              {author?.email} · {author?.city}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-paper p-3 text-center">
          <Meta label="Sold" value={number(totals.copies_sold)} center />
          <Meta label="Earned" value={inr(totals.royalty_earned)} center />
          <Meta label="Pending" value={inr(totals.royalty_pending)} center tone={totals.royalty_pending ? 'text-ochre-600' : ''} />
        </dl>
        <ul className="mt-4 space-y-2.5">
          {books.map((b) => (
            <li key={b._id} className={cn('rounded-lg px-2 py-1.5 text-[13px]', String(b._id) === String(ticketBookId) && 'bg-leaf-50 ring-1 ring-leaf-100')}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{b.title}</span>
                <BookStatusBadge status={b.status} />
              </div>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                {inr(b.royalty_pending)} pending · last payout {b.last_royalty_payout_date ? date(b.last_royalty_payout_date) : 'never'}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-ink-muted">
          Member since {date(author?.joined_date)} · {openTickets} active ticket{openTickets === 1 ? '' : 's'}
        </p>
      </div>
    </Card>
  );
}

export function NotesPanel({ notes, onAdd }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    const ok = await onAdd(text.trim());
    setSaving(false);
    if (ok) setText('');
  };

  return (
    <Card className="border-ochre-100">
      <CardHeader
        className="border-ochre-100 bg-ochre-50/50"
        title={
          <span className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-ochre-600" /> Internal notes
          </span>
        }
        description="Only the BookLeaf team can see these."
      />
      <div className="p-5">
        {notes.length > 0 && (
          <ul className="mb-4 space-y-3">
            {notes.map((n) => (
              <li key={n._id} className="animate-fade-up text-[13px]">
                <p className="text-ink-soft">{n.note}</p>
                <p className="mt-1 text-[11px] text-ink-faint">
                  {n.admin_name} · {ago(n.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={submit} className="space-y-2">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note for the team..." className="text-[13px]" />
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" type="submit" loading={saving} disabled={!text.trim()}>
              Add note
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-3">
      <span className="text-[13px] text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

function Meta({ label, value, center, tone }) {
  return (
    <div className={cn(center && 'text-center')}>
      <dt className="text-[11px] text-ink-faint">{label}</dt>
      <dd className={cn('num mt-0.5 text-[13px] text-ink', tone)}>{value}</dd>
    </div>
  );
}
