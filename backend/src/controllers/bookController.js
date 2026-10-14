const Book = require('../models/Book');
const { asyncHandler, notFound, forbidden } = require('../utils/http');
const { ROLES } = require('../constants');

// GET /api/books  (author: own books)
const listMyBooks = asyncHandler(async (req, res) => {
  const books = await Book.find({ author_id: req.user.author_id }).sort({ publication_date: -1, title: 1 });
  const sum = (key) => books.reduce((s, b) => s + (b[key] || 0), 0);

  res.json({
    success: true,
    data: books,
    meta: {
      total: books.length,
      published: books.filter((b) => b.is_published).length,
      in_production: books.filter((b) => !b.is_published).length,
      copies_sold: sum('total_copies_sold'),
      royalty_earned: sum('total_royalty_earned'),
      royalty_paid: sum('royalty_paid'),
      royalty_pending: sum('royalty_pending'),
    },
  });
});

// GET /api/books/:id  (author: own book only; admin: any)
const getBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw notFound('Book');
  if (req.user.role !== ROLES.ADMIN && book.author_id !== req.user.author_id) {
    throw forbidden('You can only view your own books.');
  }
  res.json({ success: true, data: book });
});

module.exports = { listMyBooks, getBook };
