const express = require('express');
const router = express.Router();
const { getMyBooks, getBookById } = require('../controllers/bookController');
const { authenticate } = require('../middleware/auth');

// All book routes are protected
router.use(authenticate);

router.get('/my', getMyBooks);
router.get('/:id', getBookById);

module.exports = router;

