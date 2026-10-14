// Small helpers so controllers can stay focused on business logic.

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const notFound = (what = 'Resource') => new HttpError(404, `${what} not found.`);
const forbidden = (message = 'You do not have access to this resource.') => new HttpError(403, message);
const badRequest = (message, details) => new HttpError(400, message, details);

// Wraps async route handlers so rejected promises reach the error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Escape user input before using it inside a RegExp (prevents regex injection / ReDoS).
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { HttpError, notFound, forbidden, badRequest, asyncHandler, escapeRegex };
