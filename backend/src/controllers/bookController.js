const Book = require('../models/Book');

// GET /api/books/my
const getMyBooks = async (req, res, next) => {
  try {
    const authorId = req.user.author_id;
    const books = await Book.find({ author_id: authorId }).sort({ publication_date: -1, created_at: -1 });

    const summary = {
      totalBooks: books.length,
      publishedBooks: books.filter((b) => b.status === 'Published & Live').length,
      inProductionBooks: books.filter((b) => b.status.startsWith('In Production')).length,
      totalCopiesSold: books.reduce((sum, b) => sum + (b.total_copies_sold || 0), 0),
      totalRoyaltyEarned: books.reduce((sum, b) => sum + (b.total_royalty_earned || 0), 0),
      royaltyPaid: books.reduce((sum, b) => sum + (b.royalty_paid || 0), 0),
      royaltyPending: books.reduce((sum, b) => sum + (b.royalty_pending || 0), 0),
    };

    res.json({
      success: true,
      summary,
      count: books.length,
      data: books,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/books/:id
const getBookById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Role-based access control: author can only view their own book, admin can view any
    if (req.user.role !== 'admin' && book.author_id !== req.user.author_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this book record.',
      });
    }

    res.json({
      success: true,
      data: book,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyBooks,
  getBookById,
};
