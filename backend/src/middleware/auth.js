const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');
const { HttpError } = require('../utils/http');
const { ROLES } = require('../constants');

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// Shared by the HTTP middleware and the Socket.IO handshake.
async function userFromToken(token) {
  if (!token) throw new HttpError(401, 'Authentication required.');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    throw new HttpError(401, expired ? 'Session expired. Please sign in again.' : 'Invalid authentication token.');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'Account no longer exists.');
  return user;
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    req.user = await userFromToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, 'You do not have permission to perform this action.'));
  }
  next();
};

module.exports = {
  signToken,
  userFromToken,
  authenticate,
  requireRole,
  requireAdmin: requireRole(ROLES.ADMIN),
  requireAuthor: requireRole(ROLES.AUTHOR),
};
