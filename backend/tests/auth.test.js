const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, login, loginAdmin } = require('./helpers');

describe('auth', () => {
  let api;
  before(async () => {
    api = await setup();
  });
  after(teardown);

  it('logs an author in and returns a token, profile and royalty summary', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'rohit.kapoor@email.com', password: 'author123' });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
    const { user } = res.body.data;
    assert.equal(user.role, 'author');
    assert.equal(user.author_id, 'AUTH002');
    assert.equal(user.summary.books, 2);
    assert.equal(user.summary.royalty_pending, 5280 + 7744);
    assert.equal(user.password, undefined);
  });

  it('logs an admin in without an author summary', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'admin@bookleaf.pub', password: 'admin123' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, 'admin');
    assert.equal(res.body.data.user.summary, null);
  });

  it('accepts emails regardless of case and surrounding whitespace', async () => {
    const res = await api.post('/api/auth/login').send({ email: '  Priya.Sharma@Email.com ', password: 'author123' });
    assert.equal(res.status, 200);
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    const wrongPass = await api.post('/api/auth/login').send({ email: 'priya.sharma@email.com', password: 'nope' });
    const unknown = await api.post('/api/auth/login').send({ email: 'nobody@email.com', password: 'nope' });
    assert.equal(wrongPass.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrongPass.body.error.message, unknown.body.error.message);
  });

  it('validates the login payload', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'not-an-email' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.some((d) => d.field === 'email'));
  });

  it('rejects malformed JSON with a 400, not a 500', async () => {
    const res = await api.post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    assert.equal(res.status, 400);
  });

  it('protects /me and accepts a valid token', async () => {
    assert.equal((await api.get('/api/auth/me')).status, 401);
    assert.equal((await api.get('/api/auth/me').set('Authorization', 'Bearer garbage')).status, 401);

    const token = await login(api, 'meera.nair@email.com');
    const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Meera Nair');
  });

  it('lists demo accounts without any credential fields', async () => {
    const res = await api.get('/api/auth/demo-accounts');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.filter((u) => u.role === 'author').length, 10);
    assert.ok(res.body.data.every((u) => !('password' in u)));
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const token = await loginAdmin(api);
    const res = await api.get('/api/does-not-exist').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});
