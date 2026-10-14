import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { PRIORITIES, SLA_HOURS } from '../../lib/constants';
import { Card, CardHeader, PageHeader, Skeleton, Stat } from '../../components/ui';
import { PriorityBadge } from '../../components/badges';

const pct = (n) => `${Math.round((n || 0) * 100)}%`;

export default function Insights() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/stats')
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <Card className="p-6 text-clay-700">{error}</Card>;

  if (!stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const { tickets, ai, ai_status: aiStatus } = stats;
  const active = tickets.open + tickets.in_progress;
  const maxCategory = Math.max(1, ...tickets.by_category.map((c) => c.count));
  const llmTriaged = Object.entries(ai.triage_sources).filter(([k]) => k !== 'fallback').reduce((s, [, v]) => s + v, 0);

  return (
    <>
      <PageHeader eyebrow="Support operations" title="Insights" description="Queue health and how much the AI assistant is actually helping." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active tickets" value={active} hint={`${tickets.open} open · ${tickets.in_progress} in progress`} />
        <Stat label={`Over ${SLA_HOURS}h`} value={tickets.sla_breached} tone={tickets.sla_breached ? 'clay' : undefined} hint="Active and older than the SLA" />
        <Stat label="First response" value={tickets.avg_first_response_hours != null ? `${tickets.avg_first_response_hours}h` : '—'} hint="Average time to first reply" />
        <Stat label="Resolved" value={tickets.resolved + tickets.closed} hint={`of ${tickets.total} tickets`} tone="leaf" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tickets by category" description="Where author questions are coming from" />
          <ul className="space-y-3.5 p-5">
            {tickets.by_category.map(({ category, count }) => (
              <li key={category}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <Link to={`/admin?category=${encodeURIComponent(category)}`} className="hover:underline">
                    {category}
                  </Link>
                  <span className="num text-ink-muted">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div className="h-full rounded-full bg-leaf-500 transition-[width] duration-700" style={{ width: `${(count / maxCategory) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Active by priority" />
          <ul className="divide-y divide-line">
            {PRIORITIES.map((p) => (
              <li key={p} className="flex items-center justify-between px-5 py-3">
                <PriorityBadge priority={p} />
                <Link to={`/admin?priority=${p}`} className="num font-display text-[20px] hover:underline">
                  {tickets.active_by_priority[p] || 0}
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="AI assistant"
            description={aiStatus.provider === 'none' ? 'No API key configured: triage and drafts use the rule-based fallback.' : `${aiStatus.provider} · ${aiStatus.model}${aiStatus.circuitOpen ? ' · paused after repeated errors' : ''}`}
          />
          <dl className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
            <Metric label="Triaged by model" value={`${llmTriaged}/${tickets.total}`} note={`${ai.triage_sources.fallback || 0} by fallback rules`} />
            <Metric label="Category overridden" value={pct(ai.category_override_rate)} note="Lower is better: admins agreed with the AI" />
            <Metric label="Priority overridden" value={pct(ai.priority_override_rate)} note="Tracked per ticket, original kept" />
            <Metric label="Replies from drafts" value={`${ai.ai_assisted_replies}/${ai.replies}`} note={`${ai.drafts_sent_unedited} sent without edits`} />
          </dl>
        </Card>
      </div>
    </>
  );
}

function Metric({ label, value, note }) {
  return (
    <div className="px-5 py-5">
      <dt className="eyebrow">{label}</dt>
      <dd className="num mt-2 font-display text-[26px] leading-none">{value}</dd>
      <p className="mt-2 text-[12px] text-ink-muted">{note}</p>
    </div>
  );
}
