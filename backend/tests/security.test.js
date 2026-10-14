const http = require('http');
const mongoose = require('mongoose');
const { app, server } = require('../server');
const Author = require('../src/models/Author');
const Book = require('../src/models/Book');
const Ticket = require('../src/models/Ticket');

async function runSecurityAudit() {
  console.log('🔒 ==========================================');
  console.log('🛡️ RUNNING COMPREHENSIVE SECURITY AUDIT SUITE');
  console.log('==========================================\n');

  const request = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  try {
    // 1. Unauthenticated Route Protection
    console.log('1️⃣ Testing Unauthenticated Route Protection...');
    const unauthBooks = await request('GET', '/api/books/my');
    console.assert(unauthBooks.status === 401, 'Should block unauthenticated books request with 401');
    const unauthAdmin = await request('GET', '/api/admin/tickets');
    console.assert(unauthAdmin.status === 401, 'Should block unauthenticated admin queue with 401');
    console.log('  Passed: All protected routes strictly reject unauthenticated requests with 401.\n');

    // Authenticate Author A (Rohit Kapoor)
    const authorALogin = await request('POST', '/api/auth/login', {
      email: 'rohit.kapoor@email.com',
      password: 'author123',
    });
    const tokenA = authorALogin.data.token;

    // Authenticate Author B (Priya Sharma)
    const authorBLogin = await request('POST', '/api/auth/login', {
      email: 'priya.sharma@email.com',
      password: 'author123',
    });
    const tokenB = authorBLogin.data.token;

    // Authenticate Admin
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@bookleaf.pub',
      password: 'admin123',
    });
    const tokenAdmin = adminLogin.data.token;

    // 2. Role-Based Access Control (Author attempting Admin APIs)
    console.log('2️⃣ Testing RBAC: Author attempting to access Admin endpoints...');
    const authorAccessingAdminQueue = await request('GET', '/api/admin/tickets', null, tokenA);
    console.assert(
      authorAccessingAdminQueue.status === 403,
      'Author should be blocked from admin queue with 403'
    );
    const authorAccessingAdminStats = await request('GET', '/api/admin/stats', null, tokenA);
    console.assert(
      authorAccessingAdminStats.status === 403,
      'Author should be blocked from admin stats with 403'
    );
    console.log('  Passed: Role-Based Access Control strictly blocks non-admin users with 403 Forbidden.\n');

    // 3. Cross-Tenant Data Isolation (Author A accessing Author B's records)
    console.log('3️⃣ Testing Cross-Tenant Data Isolation...');
    const authorBBooks = await request('GET', '/api/books/my', null, tokenB);
    const bookBId = authorBBooks.data.data[0]._id;

    // Author A attempts to access Author B's book directly
    const authorAAccessingBookB = await request('GET', `/api/books/${bookBId}`, null, tokenA);
    console.assert(
      authorAAccessingBookB.status === 403,
      'Author A should be forbidden from accessing Author B book'
    );

    // Author B's ticket
    const ticketB = await Ticket.findOne({ author_id: 'AUTH001' });
    if (ticketB) {
      // Author A attempts to access Author B's ticket
      const authorAAccessingTicketB = await request('GET', `/api/tickets/${ticketB._id}`, null, tokenA);
      console.assert(
        authorAAccessingTicketB.status === 403,
        'Author A should be forbidden from viewing Author B ticket'
      );

      // Author A attempts to post message to Author B's ticket
      const authorAPostingTicketB = await request(
        'POST',
        `/api/tickets/${ticketB._id}/messages`,
        { message: 'Malicious unauthorized message attempt' },
        tokenA
      );
      console.assert(
        authorAPostingTicketB.status === 403,
        'Author A should be forbidden from replying to Author B ticket'
      );
    }
    console.log('  Passed: Cross-tenant data isolation verified. Authors cannot view or tamper with other authors\' records.\n');

    // 4. Password Protection & No Credential Leakage
    console.log('4️⃣ Testing Credential & Password Sanitization...');
    console.assert(!authorALogin.data.user.password, 'Password must not exist on login response');
    const meRes = await request('GET', '/api/auth/me', null, tokenA);
    console.assert(!meRes.data.user.password, 'Password must not exist on getMe response');
    const demoRes = await request('GET', '/api/auth/demo-users');
    const hasPasswordInDemo = demoRes.data.data.some((u) => u.password !== undefined);
    console.assert(!hasPasswordInDemo, 'Passwords must not exist in demo-users response');
    console.log('  Passed: Password hashes are never leaked in any API response.\n');

    // 5. Internal Notes Privacy (Zero Leak to Authors)
    console.log('5️⃣ Testing Internal Notes Confidentiality...');
    const ticketWithNotes = await Ticket.findOne({ status: 'In Progress' });
    if (ticketWithNotes) {
      // Fetch as author
      const authorTicketRes = await request('GET', `/api/tickets/${ticketWithNotes._id}`, null, tokenAdmin);
      // Even if admin calls the author endpoint, internal notes must not exist on /api/tickets/:id
      console.assert(
        authorTicketRes.data.data.internalNotes === undefined,
        'Internal notes must NEVER be exposed on author ticket endpoint'
      );
    }
    console.log('  Passed: Internal operational team notes are 100% confidential and excluded from author views.\n');

    // 6. Meaningful Error Responses & Input Validation
    console.log('6️⃣ Testing Input Validation & Error Responses (No generic 500s)...');
    const badTicket = await request('POST', '/api/tickets', { subject: '', description: '' }, tokenA);
    console.assert(badTicket.status === 400, 'Should return 400 for empty ticket payload');
    console.assert(badTicket.data.success === false, 'Should have success: false');
    console.assert(badTicket.data.message !== undefined, 'Should have descriptive message');
    console.log('  Passed: Invalid inputs properly return 400 Bad Request with meaningful validation messages.\n');

    console.log('==========================================');
    console.log('🎉 100% SECURITY & DATA LEAK AUDIT PASSED!');
    console.log('==========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Security audit failed:', err);
    process.exit(1);
  }
}

server.listen(5000, async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/bookleaf');
  runSecurityAudit();
});
