const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, login, loginAdmin } = require('./helpers');

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('ticket lifecycle', () => {
  let api;
  let rohit;
  let priya;
  let admin;
  let rohitBooks;

  before(async () => {
    api = await setup();
    rohit = await login(api, 'rohit.kapoor@email.com');
    priya = await login(api, 'priya.sharma@email.com');
    admin = await loginAdmin(api);
    rohitBooks = (await api.get('/api/books').set(auth(rohit))).body.data;
  });
  after(teardown);

  it('validates new tickets with field-level errors', async () => {
    const res = await api.post('/api/tickets').set(auth(rohit)).send({ subject: 'Hi', description: 'short' });
    assert.equal(res.status, 400);
    const fields = res.body.error.details.map((d) => d.field);
    assert.ok(fields.includes('subject'));
    assert.ok(fields.includes('description'));
  });

  it('rejects attachments with an unsupported type', async () => {
    const res = await api.post('/api/tickets').set(auth(rohit)).send({
      subject: 'Print defect on copies',
      description: 'Pages 10 to 20 are printed upside down in my copies.',
      attachment: { original_name: 'run.exe', mime_type: 'application/x-msdownload', size_kb: 10 },
    });
    assert.equal(res.status, 400);
  });

  it('refuses a ticket against someone else\'s book', async () => {
    const priyaBook = (await api.get('/api/books').set(auth(priya))).body.data[0];
    const res = await api.post('/api/tickets').set(auth(rohit)).send({
      book_id: priyaBook._id,
      subject: 'Royalty question',
      description: 'Why is my royalty lower than expected this quarter?',
    });
    assert.equal(res.status, 400);
  });

  it('does not let an admin raise tickets through the author API', async () => {
    const res = await api.post('/api/tickets').set(auth(admin)).send({
      subject: 'Royalty question',
      description: 'Why is my royalty lower than expected this quarter?',
    });
    assert.equal(res.status, 403);
  });

  let ticketId;

  it('creates a triaged ticket and hides internal fields from the author', async () => {
    const startupSutra = rohitBooks.find((b) => b.book_id === 'BK004');
    const res = await api.post('/api/tickets').set(auth(rohit)).send({
      book_id: startupSutra._id,
      subject: 'Royalty not received for months',
      description: 'I have Rs 7,744 pending on Startup Sutra and have not received a payout in months. Please check.',
      attachment: { original_name: 'statement.pdf', mime_type: 'application/pdf', size_kb: 120 },
    });

    assert.equal(res.status, 201);
    const t = res.body.data;
    ticketId = t._id;
    assert.match(t.ticket_number, /^BL-\d+$/);
    assert.equal(t.status, 'Open');
    assert.equal(t.category, 'Royalty & Payments');
    assert.equal(t.book_title, 'Startup Sutra');
    assert.equal(t.attachment.original_name, 'statement.pdf');
    // Internal triage data stays on the admin side.
    for (const hidden of ['priority', 'ai_category', 'ai_priority', 'ai_draft', 'assigned_to', 'ai_triage_meta']) {
      assert.equal(t[hidden], undefined, `${hidden} should not be exposed to authors`);
    }
  });

  it('gives sequential ticket numbers', async () => {
    const make = () =>
      api.post('/api/tickets').set(auth(priya)).send({ subject: 'General question', description: 'Can I update my author bio on Amazon?' });
    const [a, b] = await Promise.all([make(), make()]);
    const nums = [a.body.data.ticket_number, b.body.data.ticket_number].map((n) => Number(n.slice(3)));
    assert.notEqual(nums[0], nums[1]);
  });

  it('lists the author\'s own tickets only', async () => {
    const mine = (await api.get('/api/tickets').set(auth(rohit))).body.data;
    assert.ok(mine.length >= 1);
    assert.ok(mine.every((t) => t.ticket_number));

    const priyas = (await api.get('/api/tickets').set(auth(priya))).body.data;
    assert.ok(!priyas.some((t) => t._id === ticketId));
  });

  it('blocks other authors from reading or replying to the ticket', async () => {
    assert.equal((await api.get(`/api/tickets/${ticketId}`).set(auth(priya))).status, 403);
    const reply = await api.post(`/api/tickets/${ticketId}/messages`).set(auth(priya)).send({ body: 'hello' });
    assert.equal(reply.status, 403);
  });

  it('shows the ticket in the admin queue with AI triage', async () => {
    const res = await api.get('/api/admin/tickets').set(auth(admin));
    const t = res.body.data.find((x) => x._id === ticketId);
    assert.ok(t);
    assert.ok(['Critical', 'High'].includes(t.priority), `expected urgent priority, got ${t.priority}`);
    assert.equal(t.ai_triage_meta.source, 'fallback');
    assert.ok(t.ai_category.reasoning);
  });

  it('generates a grounded draft on demand', async () => {
    const res = await api.post(`/api/admin/tickets/${ticketId}/draft`).set(auth(admin));
    assert.equal(res.status, 201);
    const draft = res.body.data;
    assert.match(draft.text, /^Hi Rohit/);
    assert.match(draft.text, /₹7,744/);
    assert.match(draft.text, /Warm regards/);
    assert.ok(draft.kb_sections.includes('royalty'));
    assert.equal(draft.stale, false);
  });

  it('sends an admin reply that the author sees, and tracks draft usage', async () => {
    const detail = (await api.get(`/api/admin/tickets/${ticketId}`).set(auth(admin))).body.data;
    const edited = `${detail.ticket.ai_draft.text}\n\nP.S. Finance has been looped in.`;

    const res = await api.post(`/api/admin/tickets/${ticketId}/replies`).set(auth(admin)).send({ body: edited, from_draft: true });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.message.ai_assisted, true);
    assert.equal(res.body.data.message.ai_draft_edited, true);
    assert.equal(res.body.data.ticket.status, 'In Progress');
    assert.equal(res.body.data.ticket.assigned_to_name, 'Aditi Verma');

    const list = (await api.get('/api/tickets').set(auth(rohit))).body.data;
    assert.equal(list.find((t) => t._id === ticketId).unread_for_author, true);

    const view = (await api.get(`/api/tickets/${ticketId}`).set(auth(rohit))).body.data;
    assert.equal(view.messages.length, 2);
    assert.equal(view.messages[1].sender_role, 'admin');
    assert.equal(view.messages[1].ai_assisted, undefined, 'AI usage flags are admin-only');

    const after = (await api.get('/api/tickets').set(auth(rohit))).body.data;
    assert.equal(after.find((t) => t._id === ticketId).unread_for_author, false, 'opening the ticket marks it read');
  });

  it('marks the draft stale when the author follows up', async () => {
    const res = await api.post(`/api/tickets/${ticketId}/messages`).set(auth(rohit)).send({ body: 'Thanks, any update?' });
    assert.equal(res.status, 201);
    const detail = (await api.get(`/api/admin/tickets/${ticketId}`).set(auth(admin))).body.data;
    assert.equal(detail.ticket.ai_draft.stale, true);
  });

  it('reopens a resolved ticket when the author replies, and blocks replies once closed', async () => {
    await api.patch(`/api/admin/tickets/${ticketId}`).set(auth(admin)).send({ status: 'Resolved' });
    await api.post(`/api/tickets/${ticketId}/messages`).set(auth(rohit)).send({ body: 'Still not received.' });
    let detail = (await api.get(`/api/admin/tickets/${ticketId}`).set(auth(admin))).body.data;
    assert.equal(detail.ticket.status, 'In Progress');
    assert.equal(detail.ticket.resolved_at, null);

    await api.patch(`/api/admin/tickets/${ticketId}`).set(auth(admin)).send({ status: 'Closed' });
    const blocked = await api.post(`/api/tickets/${ticketId}/messages`).set(auth(rohit)).send({ body: 'Hello?' });
    assert.equal(blocked.status, 400);
    detail = (await api.get(`/api/admin/tickets/${ticketId}`).set(auth(admin))).body.data;
    assert.equal(detail.ticket.status, 'Closed');
  });
});
