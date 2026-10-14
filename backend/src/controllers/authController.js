const jwt = require('jsonwebtoken');
const Author = require('../models/Author');
const Book = require('../models/Book');
const config = require('../config/config');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      author_id: user.author_id,
      role: user.role,
      name: user.name,
      email: user.email,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const user = await Author.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    const token = generateToken(user);

    // If author, fetch total books count and pending royalty
    let authorStats = null;
    if (user.role === 'author') {
      const books = await Book.find({ author_id: user.author_id });
      authorStats = {
        totalBooks: books.length,
        totalCopiesSold: books.reduce((acc, b) => acc + (b.total_copies_sold || 0), 0),
        totalRoyaltyEarned: books.reduce((acc, b) => acc + (b.total_royalty_earned || 0), 0),
        royaltyPaid: books.reduce((acc, b) => acc + (b.royalty_paid || 0), 0),
        royaltyPending: books.reduce((acc, b) => acc + (b.royalty_pending || 0), 0),
      };
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        author_id: user.author_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        city: user.city,
        joined_date: user.joined_date,
        stats: authorStats,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await Author.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let authorStats = null;
    if (user.role === 'author') {
      const books = await Book.find({ author_id: user.author_id });
      authorStats = {
        totalBooks: books.length,
        totalCopiesSold: books.reduce((acc, b) => acc + (b.total_copies_sold || 0), 0),
        totalRoyaltyEarned: books.reduce((acc, b) => acc + (b.total_royalty_earned || 0), 0),
        royaltyPaid: books.reduce((acc, b) => acc + (b.royalty_paid || 0), 0),
        royaltyPending: books.reduce((acc, b) => acc + (b.royalty_pending || 0), 0),
      };
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        author_id: user.author_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        city: user.city,
        joined_date: user.joined_date,
        stats: authorStats,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/demo-users (Public list of sample authors & admin for reviewer 1-click test login)
const getDemoUsers = async (req, res, next) => {
  try {
    const authors = await Author.find().select('author_id name email role city').lean();
    res.json({
      success: true,
      data: authors,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  getMe,
  getDemoUsers,
};

