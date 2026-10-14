const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, login, loginAdmin } = require('./helpers');

describe('books', () => {
  let api;
  before(async () => {
    api = await setup();
  });
  after(teardown);

  it('returns only the signed-in author\'s books with totals', async () => {
    const token = await login(api, 'rohit.kapoor@email.com');
    const res = await api.get('/api/books').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.map((b) => b.book_id).sort(), ['BK003', 'BK004']);
    assert.ok(res.body.data.every((b) => b.author_id === 'AUTH002'));
    assert.equal(res.body.meta.copies_sold, 876 + 1203);
    assert.equal(res.body.meta.royalty_earned, 26280 + 57744);
  });

  it('handles books still in production (null MRP, ISBN dates, zero royalty)', async () => {
    const token = await login(api, 'sneha.kulkarni@email.com');
    const res = await api.get('/api/books').set('Authorization', `Bearer ${token}`);
    const draft = res.body.data.find((b) => b.book_id === 'BK013');
    assert.equal(draft.status, 'In Production - Cover Design');
    assert.equal(draft.mrp, null);
    assert.equal(draft.publication_date, null);
    assert.equal(draft.is_published, false);
    assert.equal(res.body.meta.in_production, 1);
    assert.equal(res.body.meta.published, 2);
  });

  it('blocks an author from reading another author\'s book', async () => {
    const priya = await login(api, 'priya.sharma@email.com');
    const rohit = await login(api, 'rohit.kapoor@email.com');
    const priyaBooks = await api.get('/api/books').set('Authorization', `Bearer ${priya}`);
    const bookId = priyaBooks.body.data[0]._id;

    assert.equal((await api.get(`/api/books/${bookId}`).set('Authorization', `Bearer ${priya}`)).status, 200);
    assert.equal((await api.get(`/api/books/${bookId}`).set('Authorization', `Bearer ${rohit}`)).status, 403);
  });

  it('lets an admin read any book but not the author-only list', async () => {
    const admin = await loginAdmin(api);
    const priya = await login(api, 'priya.sharma@email.com');
    const bookId = (await api.get('/api/books').set('Authorization', `Bearer ${priya}`)).body.data[0]._id;

    assert.equal((await api.get(`/api/books/${bookId}`).set('Authorization', `Bearer ${admin}`)).status, 200);
    assert.equal((await api.get('/api/books').set('Authorization', `Bearer ${admin}`)).status, 403);
  });

  it('returns 400 for a malformed id and 404 for a missing book', async () => {
    const token = await loginAdmin(api);
    assert.equal((await api.get('/api/books/123').set('Authorization', `Bearer ${token}`)).status, 400);
    assert.equal((await api.get('/api/books/65f000000000000000000000').set('Authorization', `Bearer ${token}`)).status, 404);
  });
});
