const router = require('express').Router();
const tickets = require('../controllers/ticketController');
const { authenticate, requireAuthor } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators');

// Author-facing ticket API. Admins use /api/admin/tickets instead.
router.use(authenticate, requireAuthor);

router.get('/', validate(v.authorTicketList), tickets.list);
router.post('/', validate(v.createTicket), tickets.create);
router.get('/:id', validate([v.mongoIdParam]), tickets.get);
router.post('/:id/messages', validate(v.addMessage), tickets.addMessage);

module.exports = router;
