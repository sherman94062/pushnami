const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  },
});

// Stricter rate limiter for write operations - 20 requests per 15 minutes
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many write requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Write rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({ error: 'Too many write requests, please try again later.' });
  },
});

// Very strict rate limiter for event ingestion - 300 requests per minute
const eventLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  message: { error: 'Event ingestion rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Event rate limit exceeded', {
      ip: req.ip,
      visitor_id: req.body?.visitor_id,
    });
    res.status(429).json({ error: 'Event ingestion rate limit exceeded.' });
  },
});

module.exports = {
  generalLimiter,
  writeLimiter,
  eventLimiter,
};
