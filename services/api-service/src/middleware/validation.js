const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware to check validation results from express-validator
 * Returns 400 with validation errors if validation fails
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: errors.array(),
    });
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

/**
 * Middleware to set request timeout
 */
const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    req.setTimeout(timeout, () => {
      logger.error('Request timeout', {
        path: req.path,
        method: req.method,
        timeout,
      });
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' });
      }
    });
    next();
  };
};

module.exports = {
  validate,
  requestTimeout,
};
