import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { date, inr, number } from '../../lib/format';
import { Avatar, Card, EmptyState, Input, PageHeader, Skeleton } from '../../components/ui';

export default function Authors() {
  const [authors, setAuthors] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    api
      .get('/admin/authors')
      .then((res) => setAuthors(res.data.data))
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return authors || [];
    return (authors || []).filter((a) => [a.name, a.email, a.city, a.author_id].some((v) => v?.toLowerCase().includes(needle)));
  }, [authors, q]);

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Authors"
        description="Royalty position and support activity for every author."
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or city" className="h-9 pl-9" />
          </div>
        }
      />

      <Card className="overflow-hidden">
        {error ? (
          <p className="p-6 text-clay-700">{error}</p>
        ) : !authors ? (
          <div className="space-y-px p-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No authors match" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-ink-muted">
                  <th className="px-5 py-2.5 font-medium">Author</th>
                  <th className="px-3 py-2.5 text-right font-medium">Books</th>
                  <th className="px-3 py-2.5 text-right font-medium">Copies sold</th>
                  <th className="px-3 py-2.5 text-right font-medium">Earned</th>
                  <th className="px-3 py-2.5 text-right font-medium">Pending</th>
                  <th className="px-5 py-2.5 text-right font-medium">Tickets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((a) => (
                  <tr key={a.author_id} className="transition hover:bg-paper">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.name} size="sm" />
                        <div className="min-w-0 leading-tight">
                          <p className="truncate font-medium">{a.name}</p>
                          <p className="truncate text-[12px] text-ink-muted">
                            {a.email} · {a.city} · since {date(a.joined_date)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="num px-3 py-3 text-right">{a.books}</td>
                    <td className="num px-3 py-3 text-right">{number(a.copies_sold)}</td>
                    <td className="num px-3 py-3 text-right">{inr(a.royalty_earned)}</td>
                    <td className={`num px-3 py-3 text-right ${a.royalty_pending ? 'text-ochre-600' : 'text-ink-muted'}`}>{inr(a.royalty_pending)}</td>
                    <td className="px-5 py-3 text-right">
                      {a.tickets_total ? (
                        <Link to={`/admin?search=${encodeURIComponent(a.name)}`} className="link">
                          {a.tickets_active} active / {a.tickets_total}
                        </Link>
                      ) : (
                        <span className="text-ink-faint">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
