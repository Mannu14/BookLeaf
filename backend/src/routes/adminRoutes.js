const express = require('express');
const router = express.Router();
const {
  getAllTickets,
  getTicketDetailsAdmin,
  updateTicketAdmin,
  regenerateAIDraft,
  sendAdminReply,
  addInternalNote,
  getAdminStats,
  getAllAuthors,
} = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All admin routes strictly require admin role
router.use(authenticate, requireAdmin);

router.get('/tickets', getAllTickets);
router.get('/tickets/:id', getTicketDetailsAdmin);
router.patch('/tickets/:id', updateTicketAdmin);
router.post('/tickets/:id/ai-draft', regenerateAIDraft);
router.post('/tickets/:id/replies', sendAdminReply);
router.post('/tickets/:id/notes', addInternalNote);
router.get('/stats', getAdminStats);
router.get('/authors', getAllAuthors);

module.exports = router;
