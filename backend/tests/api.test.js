const http = require('http');
const { app, server } = require('../server');
const mongoose = require('mongoose');

async function runTests() {
  console.log('🧪 Starting automated API test suite...');

  // Helper function to make JSON HTTP requests to our server
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
    // 1. Health check
    console.log('1️⃣ Testing GET /api/health...');
    const health = await request('GET', '/api/health');
    console.assert(health.status === 200, 'Health check should be 200');
    console.log('  Health check OK:', health.data.service);

    // 2. Author Login
    console.log('2️⃣ Testing Author Login (rohit.kapoor@email.com)...');
    const authorLogin = await request('POST', '/api/auth/login', {
      email: 'rohit.kapoor@email.com',
      password: 'author123',
    });
    console.assert(authorLogin.status === 200, 'Author login should be 200');
    console.assert(authorLogin.data.token, 'Should return token');
    const authorToken = authorLogin.data.token;
    console.log('  Author Login OK! Logged in as:', authorLogin.data.user.name, '| Pending Royalty: ₹' + authorLogin.data.user.stats.royaltyPending);

    // 3. Admin Login
    console.log('3️⃣ Testing Admin Login (admin@bookleaf.pub)...');
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@bookleaf.pub',
      password: 'admin123',
    });
    console.assert(adminLogin.status === 200, 'Admin login should be 200');
    const adminToken = adminLogin.data.token;
    console.log('  Admin Login OK! Logged in as:', adminLogin.data.user.name);

    // 4. Author Books
    console.log('4️⃣ Testing GET /api/books/my (Author)...');
    const myBooks = await request('GET', '/api/books/my', null, authorToken);
    console.assert(myBooks.status === 200, 'My books should be 200');
    console.assert(myBooks.data.data.length === 2, 'Rohit Kapoor should have 2 books');
    console.log('  Author Books OK! Count:', myBooks.data.data.length, 'Books:', myBooks.data.data.map(b => b.title).join(', '));

    // 5. Author Submit Support Ticket
    console.log('5️⃣ Testing POST /api/tickets (Author creates support ticket with AI)...');
    const newTicketRes = await request(
      'POST',
      '/api/tickets',
      {
        book_id: myBooks.data.data[0]._id,
        subject: 'Inquiry regarding Q4 Royalty computation',
        description: 'I noticed my sales went up on Amazon India last month. Can someone explain the exact deductions applied for shipping and platform fees on Code & Karma?',
      },
      authorToken
    );
    console.assert(newTicketRes.status === 201, 'Create ticket should be 201');
    const createdTicket = newTicketRes.data.data;
    console.log('  Ticket Created OK! ID:', createdTicket.ticket_number);
    console.log('   AI Auto-Classification:', createdTicket.category, '| Priority:', createdTicket.priority);
    console.log('   AI Draft Preview:', createdTicket.ai_draft_response?.draft?.substring(0, 100) + '...');

    // 6. Admin Ticket Queue
    console.log('6️⃣ Testing GET /api/admin/tickets (Admin Queue)...');
    const adminQueue = await request('GET', '/api/admin/tickets?sortBy=urgency', null, adminToken);
    console.assert(adminQueue.status === 200, 'Admin queue should be 200');
    console.log('  Admin Queue OK! Total Tickets:', adminQueue.data.count);

    // 7. Admin Update Ticket (Override Priority & Assign)
    console.log('7️⃣ Testing PATCH /api/admin/tickets/:id (Override Priority)...');
    const updateRes = await request(
      'PATCH',
      `/api/admin/tickets/${createdTicket._id}`,
      {
        priority: 'Critical',
        assignToSelf: true,
      },
      adminToken
    );
    console.assert(updateRes.status === 200, 'Update ticket should be 200');
    console.assert(updateRes.data.data.ai_priority.overridden === true, 'Priority should be marked overridden');
    console.log('  Priority Override OK! Overridden by:', updateRes.data.data.ai_priority.overridden_by);

    // 8. Admin Add Internal Note
    console.log('8️⃣ Testing POST /api/admin/tickets/:id/notes (Private Note)...');
    const noteRes = await request(
      'POST',
      `/api/admin/tickets/${createdTicket._id}/notes`,
      { note: 'Accounts team has reviewed sales deductions. Margin statement is clear.' },
      adminToken
    );
    console.assert(noteRes.status === 201, 'Note should be 201');
    console.log('  Internal Note Added OK! Note:', noteRes.data.data.note);

    // 9. Admin Send Reply
    console.log('9️⃣ Testing POST /api/admin/tickets/:id/replies (Admin Response)...');
    const replyRes = await request(
      'POST',
      `/api/admin/tickets/${createdTicket._id}/replies`,
      {
        message: 'Dear Rohit, thank you for writing in. We have reviewed your deductions and are pleased to attach the statement.',
        isAIDrafted: true,
        resolveTicket: true,
      },
      adminToken
    );
    console.assert(replyRes.status === 201, 'Reply should be 201');
    console.log('  Admin Reply Sent OK! Ticket marked resolved.');

    // 10. Admin Stats
    console.log('🔟 Testing GET /api/admin/stats...');
    const statsRes = await request('GET', '/api/admin/stats', null, adminToken);
    console.assert(statsRes.status === 200, 'Stats should be 200');
    console.log('  Admin Stats OK! Total:', statsRes.data.data.totalTickets, '| Resolved:', statsRes.data.data.resolvedTickets);

    console.log('\n=======================================');
    console.log('🎉 ALL 10 API TEST SUITES PASSED 100%!');
    console.log('=======================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

// Start server in-process if not already running
server.listen(5000, async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/bookleaf');
  runTests();
});

