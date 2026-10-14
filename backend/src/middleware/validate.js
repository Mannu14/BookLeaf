const { validationResult } = require('express-validator');

// Runs a list of express-validator chains and turns failures into a single
// 400 response with field-level details the frontend can display.
const validate = (chains) => [
  ...chains,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const errors = result.array({ onlyFirstError: true }).map((e) => ({
      field: e.path,
      location: e.location,
      message: e.msg,
    }));

    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: errors[0].message, details: errors },
    });
  },
];

module.exports = validate;
