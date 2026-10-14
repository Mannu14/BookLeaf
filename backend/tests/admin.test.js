const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, login, loginAdmin } = require('./helpers');
const { PRIORITY_RANK, STATUS_RANK } = require('../src/constants');

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('admin portal', () => {
  let api;
  let admin;
  let author;

  before(async () => {
    api = await setup({ withTickets: true });
    admin = await loginAdmin(api);
    author = await login(api, 'priya.sharma@email.com');
  });
  after(teardown);

  it('is closed to authors', async () => {
    for (const path of ['/api/admin/tickets', '/api/admin/stats', '/api/admin/authors']) {
      assert.equal((await api.get(path).set(auth(author))).status, 403, path);
    }
    assert.equal((await api.get('/api/admin/tickets')).status, 401);
  });

  it('orders the default queue by status, then priority, then age', async () => {
    const { data } = (await api.get('/api/admin/tickets').set(auth(admin))).body;
    assert.equal(data.length, 8);
    for (let i = 1; i < data.length; i++) {
      const a = data[i - 1];
      const b = data[i];
      const key = (t) => [STATUS_RANK[t.status], PRIORITY_RANK[t.priority], new Date(t.created_at).getTime()];
      const [ka, kb] = [key(a), key(b)];
      const ordered = ka[0] < kb[0] || (ka[0] === kb[0] && (ka[1] < kb[1] || (ka[1] === kb[1] && ka[2] <= kb[2])));
      assert.ok(ordered, `${a.ticket_number} should come before ${b.ticket_number}`);
    }
  });

  it('filters by status, category, priority, date range and search', async () => {
    const get = async (qs) => (await api.get(`/api/admin/tickets?${qs}`).set(auth(admin))).body;

    assert.ok((await get('status=Resolved')).data.every((t) => t.status === 'Resolved'));
    assert.ok((await get('category=Printing%20%26%20Quality')).data.every((t) => t.category === 'Printing & Quality'));
    assert.ok((await get('priority=High')).data.every((t) => t.priority === 'High'));

    const today = new Date().toISOString().slice(0, 10);
    const recent = await get(`from=${today}`);
    assert.ok(recent.data.every((t) => new Date(t.created_at).toISOString().slice(0, 10) >= today));

    const search = await get('search=Turban');
    assert.equal(search.data.length, 1);
    assert.equal(search.data[0].book_title, 'Turban Tales');

    // Regex metacharacters are treated literally rather than crashing the query.
    assert.equal((await api.get('/api/admin/tickets?search=(((').set(auth(admin))).status, 200);
  });

  it('rejects unknown filter values', async () => {
    const res = await api.get('/api/admin/tickets?status=Pending').set(auth(admin));
    assert.equal(res.status, 400);
  });

  it('paginates', async () => {
    const res = (await api.get('/api/admin/tickets?limit=3&page=2').set(auth(admin))).body;
    assert.equal(res.data.length, 3);
    assert.equal(res.meta.page, 2);
    assert.equal(res.meta.total, 8);
    assert.equal(res.meta.pages, 3);
  });

  it('records overrides against the original AI suggestion', async () => {
    const [ticket] = (await api.get('/api/admin/tickets?search=Lakshadweep').set(auth(admin))).body.data;
    const original = ticket.ai_category.value;
    const different = original === 'General Inquiry' ? 'Royalty & Payments' : 'General Inquiry';

    let res = await api.patch(`/api/admin/tickets/${ticket._id}`).set(auth(admin)).send({ category: different, priority: 'Low' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.category, different);
    assert.equal(res.body.data.ai_category.overridden, true);
    assert.equal(res.body.data.ai_category.overridden_by, 'Aditi Verma');
    assert.equal(res.body.data.ai_category.value, original, 'original AI suggestion is kept');

    // Reverting to the AI's own answer clears the override flag.
    res = await api.patch(`/api/admin/tickets/${ticket._id}`).set(auth(admin)).send({ category: original });
    assert.equal(res.body.data.ai_category.overridden, false);
  });

  it('assigns tickets and validates the patch body', async () => {
    const [ticket] = (await api.get('/api/admin/tickets?assignee=unassigned').set(auth(admin))).body.data;
    const res = await api.patch(`/api/admin/tickets/${ticket._id}`).set(auth(admin)).send({ assignee: 'me' });
    assert.equal(res.body.data.assigned_to_name, 'Aditi Verma');

    const mine = (await api.get('/api/admin/tickets?assignee=me').set(auth(admin))).body.data;
    assert.ok(mine.some((t) => t._id === ticket._id));

    assert.equal((await api.patch(`/api/admin/tickets/${ticket._id}`).set(auth(admin)).send({})).status, 400);
    assert.equal((await api.patch(`/api/admin/tickets/${ticket._id}`).set(auth(admin)).send({ status: 'Done' })).status, 400);
  });

  it('keeps internal notes away from the author', async () => {
    const [ticket] = (await api.get('/api/admin/tickets?search=Whispers').set(auth(admin))).body.data;
    const res = await api.post(`/api/admin/tickets/${ticket._id}/notes`).set(auth(admin)).send({ note: 'Called the print floor.' });
    assert.equal(res.status, 201);

    const adminView = (await api.get(`/api/admin/tickets/${ticket._id}`).set(auth(admin))).body.data;
    assert.ok(adminView.notes.some((n) => n.note === 'Called the print floor.'));

    const authorView = (await api.get(`/api/tickets/${ticket._id}`).set(auth(author))).body;
    assert.equal(authorView.success, true);
    assert.equal(authorView.data.notes, undefined);
    assert.ok(!JSON.stringify(authorView).includes('print floor'));
  });

  it('returns author context alongside a ticket', async () => {
    const [ticket] = (await api.get('/api/admin/tickets?search=Turban').set(auth(admin))).body.data;
    const { author_context } = (await api.get(`/api/admin/tickets/${ticket._id}`).set(auth(admin))).body.data;
    assert.equal(author_context.author.name, 'Arjun Malhotra');
    assert.equal(author_context.totals.books, 1);
    assert.equal(author_context.totals.royalty_pending, 2464);
  });

  it('reports queue and AI stats', async () => {
    const { data } = (await api.get('/api/admin/stats').set(auth(admin))).body;
    assert.equal(data.tickets.total, 8);
    assert.ok(data.tickets.sla_breached >= 2, 'seeded tickets older than 48h are flagged');
    assert.equal(data.ai.triage_sources.fallback, 8);
    assert.equal(data.ai_status.provider, 'none');
    assert.ok(data.tickets.by_category.length > 0);
  });

  it('lists authors with aggregated numbers', async () => {
    const { data } = (await api.get('/api/admin/authors').set(auth(admin))).body;
    assert.equal(data.length, 10);
    const sneha = data.find((a) => a.author_id === 'AUTH007');
    assert.equal(sneha.books, 3);
    assert.equal(sneha.copies_sold, 1567 + 723);
  });
});
