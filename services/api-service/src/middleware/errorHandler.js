const logger = require('../utils/logger');

module.exports = (err, req, res, _next) => {
  // Log error with context
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    code: err.code,
  });

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource not found' });
  }

  // PostgreSQL invalid UUID format
  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // PostgreSQL not null violation
  if (err.code === '23502') {
    return res.status(400).json({ error: 'Required field missing' });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message;

  res.status(status).json({ error: message });
};
