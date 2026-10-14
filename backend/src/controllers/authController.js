const User = require('../models/User');
const Book = require('../models/Book');
const { signToken } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../utils/http');
const { ROLES } = require('../constants');

async function royaltySummary(user) {
  if (user.role !== ROLES.AUTHOR) return null;
  const books = await Book.find({ author_id: user.author_id });
  const sum = (key) => books.reduce((s, b) => s + (b[key] || 0), 0);
  return {
    books: books.length,
    copies_sold: sum('total_copies_sold'),
    royalty_earned: sum('total_royalty_earned'),
    royalty_paid: sum('royalty_paid'),
    royalty_pending: sum('royalty_pending'),
  };
}

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  // Same message for unknown email and wrong password: do not reveal which accounts exist.
  if (!user || !(await user.comparePassword(password))) {
    throw new HttpError(401, 'Incorrect email or password.');
  }

  res.json({
    success: true,
    data: {
      token: signToken(user),
      user: { ...user.toPublicJSON(), summary: await royaltySummary(user) },
    },
  });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { ...req.user.toPublicJSON(), summary: await royaltySummary(req.user) } });
});

// GET /api/auth/demo-accounts  (only when DEMO_MODE is on)
const demoAccounts = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ role: 1, name: 1 }).select('name email role city author_id');
  res.json({
    success: true,
    data: users.map((u) => ({ name: u.name, email: u.email, role: u.role, city: u.city, author_id: u.author_id })),
  });
});

module.exports = { login, me, demoAccounts };
