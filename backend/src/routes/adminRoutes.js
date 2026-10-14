const router = require('express').Router();
const admin = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators');

router.use(authenticate, requireAdmin);

router.get('/stats', admin.getStats);
router.get('/authors', admin.listAuthors);
router.get('/team', admin.listTeam);

router.get('/tickets', validate(v.adminTicketList), admin.listTickets);
router.get('/tickets/:id', validate([v.mongoIdParam]), admin.getTicket);
router.patch('/tickets/:id', validate(v.updateTicket), admin.updateTicket);
router.post('/tickets/:id/draft', validate([v.mongoIdParam]), admin.generateDraft);
router.post('/tickets/:id/replies', validate(v.sendReply), admin.sendReply);
router.post('/tickets/:id/notes', validate(v.addNote), admin.addNote);

module.exports = router;
