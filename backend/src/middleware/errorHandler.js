const logger = require('../utils/logger');
const { HttpError } = require('../utils/http');

const CODES = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'RATE_LIMITED' };

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` },
  });
}

// Every error leaves the API in the same shape:
// { success: false, error: { code, message, details? } }
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Something went wrong on our side. Please try again.';
  let details;

  if (err instanceof HttpError) {
    ({ status, message, details } = err);
  } else if (err.name === 'ValidationError') {
    status = 400;
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = details[0]?.message || 'Validation failed.';
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}.`;
  } else if (err.code === 11000) {
    status = 409;
    message = `A record with this ${Object.keys(err.keyValue || {})[0] || 'value'} already exists.`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON.';
  }

  if (status >= 500) logger.error(`${req.method} ${req.originalUrl}`, err);

  res.status(status).json({
    success: false,
    error: { code: CODES[status] || 'INTERNAL_ERROR', message, ...(details && { details }) },
  });
}

module.exports = { errorHandler, notFoundHandler };
