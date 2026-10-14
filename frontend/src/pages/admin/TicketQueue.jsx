import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Inbox, Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { ACTIVE_STATUSES, CATEGORIES, PRIORITIES, SLA_HOURS, STATUSES } from '../../lib/constants';
import { ageHours, dateTime, shortAge } from '../../lib/format';
import { Avatar, Button, Card, EmptyState, Input, PageHeader, Select, Skeleton, Tabs } from '../../components/ui';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../../components/badges';
import { cn } from '../../lib/cn';

const FILTER_KEYS = ['status', 'category', 'priority', 'assignee', 'from', 'to', 'search', 'sort', 'page'];

const PRIORITY_BAR = { Critical: 'bg-clay-600', High: 'bg-clay-500/60', Medium: 'bg-ochre-500/60', Low: 'bg-line-strong' };

export default function TicketQueue() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('search') || '');
  const [flash, setFlash] = useState(new Set());

  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']));
  const query = params.toString();

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([api.get(`/admin/tickets?${query}`), api.get('/admin/stats')]);
      setResult(list.data);
      setStats(s.data.data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search box -> URL.
  useEffect(() => {
    const t = setTimeout(() => search !== filters.search && setFilter('search', search.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Live updates: refetch (server owns sort + filter) and highlight the row.
  const refreshTimer = useRef(null);
  const scheduleRefresh = (id) => {
    setFlash((s) => new Set(s).add(id));
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(load, 250);
  };
  useSocketEvent('ticket:created', (t) => {
    toast.info(`New ticket from ${t.author_name}`, `${t.priority} · ${t.subject}`);
    scheduleRefresh(t._id);
  });
  useSocketEvent('ticket:updated', (t) => scheduleRefresh(t._id));
  useSocketEvent('message:created', ({ ticketId, message }) => message.sender_role === 'author' && scheduleRefresh(ticketId));

  const hasFilters = FILTER_KEYS.some((k) => k !== 'sort' && k !== 'page' && filters[k]);
  const statusCounts = stats && {
    '': stats.tickets.total,
    Open: stats.tickets.open,
    'In Progress': stats.tickets.in_progress,
    Resolved: stats.tickets.resolved,
    Closed: stats.tickets.closed,
  };

  return (
    <>
      <PageHeader
        eyebrow="Support operations"
        title="Ticket queue"
        description="Active tickets first, then by priority, oldest at the top. AI triage sets category and priority on arrival; you can override both."
      />

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QueueChip label="Open" value={stats.tickets.open} onClick={() => setFilter('status', 'Open')} />
          <QueueChip label="In progress" value={stats.tickets.in_progress} onClick={() => setFilter('status', 'In Progress')} />
          <QueueChip label="Critical, active" value={stats.tickets.active_by_priority.Critical || 0} tone="clay" onClick={() => setFilter('priority', 'Critical')} />
          <QueueChip label={`Older than ${SLA_HOURS}h`} value={stats.tickets.sla_breached} tone={stats.tickets.sla_breached ? 'ochre' : undefined} onClick={() => setFilter('sort', 'oldest')} />
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-line p-4">
          <div className="overflow-x-auto">
            <Tabs
              value={filters.status}
              onChange={(v) => setFilter('status', v)}
              options={[{ value: '', label: 'All' }, ...STATUSES.map((s) => ({ value: s, label: s }))].map((o) => ({ ...o, count: statusCounts?.[o.value] }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, author, book or ticket #" className="h-8 pl-9 text-[13px]" />
            </div>
            <Select size="sm" value={filters.category} onChange={(e) => setFilter('category', e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select size="sm" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} aria-label="Priority">
              <option value="">Any priority</option>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
            <Select size="sm" value={filters.assignee} onChange={(e) => setFilter('assignee', e.target.value)} aria-label="Assignee">
              <option value="">Anyone</option>
              <option value="me">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
            </Select>
            <div className="flex items-center gap-1 text-[13px] text-ink-muted">
              <Input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter('from', e.target.value)} className="h-8 w-[138px] text-[13px]" aria-label="From date" />
              <span>to</span>
              <Input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} className="h-8 w-[138px] text-[13px]" aria-label="To date" />
            </div>
            <Select size="sm" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)} aria-label="Sort">
              <option value="">Most urgent</option>
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
            </Select>
            {hasFilters && (
              <Button
                size="sm"
                variant="ghost"
                icon={X}
                onClick={() => {
                  setSearch('');
                  setParams({}, { replace: true });
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {error ? (
          <p className="p-6 text-clay-700">{error}</p>
        ) : !result ? (
          <div className="space-y-px p-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[60px]" />
            ))}
          </div>
        ) : result.data.length === 0 ? (
          <EmptyState icon={Inbox} title={hasFilters ? 'No tickets match these filters' : 'The queue is empty'} description={hasFilters ? 'Try widening the date range or clearing filters.' : 'New author queries will appear here in real time.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-ink-muted">
                  <th className="w-1 p-0" />
                  <th className="px-4 py-2.5 font-medium">Ticket</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Assignee</th>
                  <th className="px-4 py-2.5 text-right font-medium">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.data.map((t) => {
                  const active = ACTIVE_STATUSES.includes(t.status);
                  const breached = active && ageHours(t.created_at) > SLA_HOURS;
                  return (
                    <tr
                      key={t._id}
                      onClick={() => navigate(`/admin/tickets/${t._id}`)}
                      onAnimationEnd={() => setFlash((s) => { const n = new Set(s); n.delete(t._id); return n; })}
                      className={cn('group cursor-pointer transition hover:bg-paper', !active && 'text-ink-muted', flash.has(t._id) && 'animate-flash')}
                    >
                      <td className="p-0">
                        <span className={cn('block h-[60px] w-1', active ? PRIORITY_BAR[t.priority] : 'bg-transparent')} />
                      </td>
                      <td className="max-w-[420px] px-4 py-3">
                        <p className={cn('truncate font-medium', active ? 'text-ink' : 'text-ink-soft')}>{t.subject}</p>
                        <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                          <span className="font-mono">{t.ticket_number}</span> · {t.author_name} · {t.book_title}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <CategoryBadge category={t.category} short />
                        {t.ai_category?.overridden && <span className="ml-1 text-[11px] text-ink-faint" title="Category set by an admin">edited</span>}
                      </td>
                      <td className="px-3 py-3">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-3 py-3">
                        {t.assigned_to_name ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={t.assigned_to_name} size="sm" tone="ink" className="h-6 w-6 text-[10px]" />
                            <span className="truncate">{t.assigned_to_name.split(' ')[0]}</span>
                          </span>
                        ) : (
                          <span className="text-ink-faint">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" title={dateTime(t.created_at)}>
                        <span className={cn('num', breached ? 'font-medium text-clay-600' : 'text-ink-muted')}>{shortAge(t.created_at)}</span>
                        {breached && <p className="text-[11px] text-clay-600">over SLA</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {result && result.meta.pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-ink-muted">
            <span>
              Page {result.meta.page} of {result.meta.pages} · {result.meta.total} tickets
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={result.meta.page <= 1} onClick={() => setFilter('page', String(result.meta.page - 1))}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={result.meta.page >= result.meta.pages} onClick={() => setFilter('page', String(result.meta.page + 1))}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function QueueChip({ label, value, tone, onClick }) {
  const tones = { clay: 'text-clay-600', ochre: 'text-ochre-600' };
  return (
    <button onClick={onClick} className="card group px-4 py-3 text-left transition hover:-translate-y-px hover:shadow-lift">
      <p className="text-[12px] text-ink-muted">{label}</p>
      <p className={cn('num mt-1 font-display text-[24px] leading-none', value ? tones[tone] : 'text-ink')}>{value}</p>
    </button>
  );
}
