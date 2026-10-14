const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const request = require('supertest');
const { io: connect } = require('socket.io-client');
require('./helpers');
const { startInMemory, disconnectDB } = require('../src/config/db');
const { createApp } = require('../src/app');
const { initSocket } = require('../src/realtime/socket');
const { seedDatabase } = require('../src/seed/seed');

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// Resolves with the first matching event, or null after `ms`.
const nextEvent = (socket, event, match = () => true, ms = 1500) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve(null);
    }, ms);
    function handler(payload) {
      if (!match(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    }
    socket.on(event, handler);
  });

describe('realtime updates', () => {
  let server;
  let url;
  let api;
  const sockets = [];

  const open = (token) =>
    new Promise((resolve, reject) => {
      const s = connect(url, { auth: { token }, transports: ['websocket'], reconnection: false });
      sockets.push(s);
      s.on('connect', () => resolve(s));
      s.on('connect_error', reject);
    });

  const tokenFor = async (email, password = 'author123') =>
    (await api.post('/api/auth/login').send({ email, password })).body.data.token;

  before(async () => {
    await mongoose.connect(await startInMemory());
    await seedDatabase({ withTickets: false });
    const app = createApp();
    server = http.createServer(app);
    initSocket(server);
    await new Promise((r) => server.listen(0, r));
    url = `http://127.0.0.1:${server.address().port}`;
    api = request(server);
  });

  after(async () => {
    sockets.forEach((s) => s.close());
    await new Promise((r) => server.close(r));
    await disconnectDB();
  });

  it('rejects sockets without a valid token', async () => {
    await assert.rejects(open(undefined));
    await assert.rejects(open('bad-token'));
  });

  it('pushes admin replies to the right author only, and notes to admins only', async () => {
    const [rohitToken, priyaToken, adminToken] = await Promise.all([
      tokenFor('rohit.kapoor@email.com'),
      tokenFor('priya.sharma@email.com'),
      tokenFor('admin@bookleaf.pub', 'admin123'),
    ]);
    const [rohit, priya, admin] = await Promise.all([open(rohitToken), open(priyaToken), open(adminToken)]);

    const adminSawTicket = nextEvent(admin, 'ticket:created');
    const created = await api
      .post('/api/tickets')
      .set(auth(rohitToken))
      .send({ subject: 'Listing unavailable', description: 'Startup Sutra is showing unavailable on Amazon US.' });
    const ticketId = created.body.data._id;
    const adminTicket = await adminSawTicket;
    assert.equal(adminTicket._id, ticketId);
    assert.ok(adminTicket.priority, 'admins receive triage data');

    const isThisTicket = (p) => p.ticketId === ticketId;
    const rohitGetsReply = nextEvent(rohit, 'message:created', isThisTicket);
    const priyaGetsReply = nextEvent(priya, 'message:created', isThisTicket, 600);
    const rohitStatus = nextEvent(rohit, 'ticket:updated', (t) => t._id === ticketId);

    await api.post(`/api/admin/tickets/${ticketId}/replies`).set(auth(adminToken)).send({ body: 'We are re-syncing the listing now.' });

    const reply = await rohitGetsReply;
    assert.equal(reply.message.body, 'We are re-syncing the listing now.');
    assert.equal(reply.message.ai_assisted, undefined);
    const update = await rohitStatus;
    assert.equal(update.status, 'In Progress');
    assert.equal(update.priority, undefined, 'author payload is sanitised');
    assert.equal(await priyaGetsReply, null, 'other authors receive nothing');

    const adminGetsNote = nextEvent(admin, 'note:created', isThisTicket);
    const rohitGetsNote = nextEvent(rohit, 'note:created', () => true, 600);
    await api.post(`/api/admin/tickets/${ticketId}/notes`).set(auth(adminToken)).send({ note: 'internal only' });
    assert.equal((await adminGetsNote).note.note, 'internal only');
    assert.equal(await rohitGetsNote, null);
  });
});
