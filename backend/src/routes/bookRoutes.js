const router = require('express').Router();
const books = require('../controllers/bookController');
const { authenticate, requireAuthor } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators');

router.use(authenticate);

router.get('/', requireAuthor, books.listMyBooks);
router.get('/:id', validate([v.mongoIdParam]), books.getBook);

module.exports = router;
