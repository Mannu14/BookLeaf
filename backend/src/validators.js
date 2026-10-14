const { body, param, query } = require('express-validator');
const { CATEGORIES, PRIORITIES, STATUSES } = require('./constants');

const ALLOWED_ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_ATTACHMENT_KB = 5 * 1024;

const mongoIdParam = param('id').isMongoId().withMessage('Invalid id.');

const login = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail({ gmail_remove_dots: false }),
  body('password').isString().notEmpty().withMessage('Password is required.'),
];

const createTicket = [
  body('book_id')
    .optional({ values: 'null' })
    .custom((v) => v === 'general' || /^[a-f0-9]{24}$/i.test(v))
    .withMessage('book_id must be a book id or "general".'),
  body('subject').isString().trim().isLength({ min: 5, max: 200 }).withMessage('Subject must be 5-200 characters.'),
  body('description')
    .isString()
    .trim()
    .isLength({ min: 15, max: 5000 })
    .withMessage('Please describe the issue in 15-5000 characters.'),
  body('attachment').optional({ values: 'null' }).isObject().withMessage('attachment must be an object.'),
  body('attachment.original_name')
    .if(body('attachment').exists({ values: 'null' }))
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Attachment name is required.'),
  body('attachment.mime_type')
    .if(body('attachment').exists({ values: 'null' }))
    .isIn(ALLOWED_ATTACHMENT_TYPES)
    .withMessage('Attachments must be PNG, JPG, WEBP or PDF.'),
  body('attachment.size_kb')
    .if(body('attachment').exists({ values: 'null' }))
    .isInt({ min: 0, max: MAX_ATTACHMENT_KB })
    .withMessage('Attachments must be 5 MB or smaller.')
    .toInt(),
];

const authorTicketList = [
  query('status').optional().isIn(STATUSES).withMessage('Unknown status.'),
];

const addMessage = [
  mongoIdParam,
  body('body').isString().trim().isLength({ min: 1, max: 5000 }).withMessage('Message must be 1-5000 characters.'),
];

const adminTicketList = [
  query('status').optional().isIn(STATUSES).withMessage('Unknown status.'),
  query('category').optional().isIn(CATEGORIES).withMessage('Unknown category.'),
  query('priority').optional().isIn(PRIORITIES).withMessage('Unknown priority.'),
  query('assignee').optional().isIn(['me', 'unassigned']).withMessage('assignee must be "me" or "unassigned".'),
  query('from').optional().isISO8601().withMessage('from must be a date (YYYY-MM-DD).'),
  query('to').optional().isISO8601().withMessage('to must be a date (YYYY-MM-DD).'),
  query('search').optional().isString().trim().isLength({ max: 100 }),
  query('sort').optional().isIn(['urgency', 'newest', 'oldest']).withMessage('sort must be urgency, newest or oldest.'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const updateTicket = [
  mongoIdParam,
  body('status').optional().isIn(STATUSES).withMessage('Unknown status.'),
  body('category').optional().isIn(CATEGORIES).withMessage('Unknown category.'),
  body('priority').optional().isIn(PRIORITIES).withMessage('Unknown priority.'),
  body('assignee')
    .optional({ values: 'undefined' })
    .custom((v) => v === null || v === 'me' || /^[a-f0-9]{24}$/i.test(v))
    .withMessage('assignee must be "me", null, or an admin id.'),
  body().custom((b) => ['status', 'category', 'priority', 'assignee'].some((k) => k in b))
    .withMessage('Provide at least one of status, category, priority or assignee.'),
];

const sendReply = [
  mongoIdParam,
  body('body').isString().trim().isLength({ min: 1, max: 10000 }).withMessage('Reply must be 1-10000 characters.'),
  body('resolve').optional().isBoolean().withMessage('resolve must be true or false.').toBoolean(),
  body('from_draft').optional().isBoolean().withMessage('from_draft must be true or false.').toBoolean(),
];

const addNote = [
  mongoIdParam,
  body('note').isString().trim().isLength({ min: 1, max: 5000 }).withMessage('Note must be 1-5000 characters.'),
];

module.exports = {
  mongoIdParam,
  login,
  createTicket,
  authorTicketList,
  addMessage,
  adminTicketList,
  updateTicket,
  sendReply,
  addNote,
};
