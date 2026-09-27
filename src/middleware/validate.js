const { validationResult } = require('express-validator');

/**
 * Middleware to check express-validator results.
 * Returns 400 with validation errors if any exist.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validasi gagal',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { validate };
