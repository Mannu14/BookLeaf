const express = require('express');
const router = express.Router();
const {
  createTicket,
  getMyTickets,
  getTicketById,
  addAuthorMessage,
} = require('../controllers/ticketController');
const { authenticate } = require('../middleware/auth');

// All ticket routes are protected
router.use(authenticate);

router.post('/', createTicket);
router.get('/my', getMyTickets);
router.get('/:id', getTicketById);
router.post('/:id/messages', addAuthorMessage);

module.exports = router;
