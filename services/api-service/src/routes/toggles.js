const { Router } = require('express');
const { body, param } = require('express-validator');
const { pool } = require('../db');
const logger = require('../utils/logger');
const { validate } = require('../middleware/validation');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = Router();

// Validation rules
const createToggleValidation = [
  body('key')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 255 })
    .matches(/^[a-z][a-z0-9_]*$/)
    .withMessage('key must start with a letter and contain only lowercase letters, numbers, and underscores'),
  body('label').isString().trim().notEmpty().isLength({ min: 1, max: 255 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('enabled').optional().isBoolean(),
  body('config').optional().isObject(),
];

const updateToggleValidation = [
  body('enabled').optional().isBoolean(),
  body('config').optional().isObject(),
];

// List all toggles
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM feature_toggles ORDER BY key'
    );
    logger.debug('Toggles listed', { count: rows.length });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Get toggle by key
router.get('/:key', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM feature_toggles WHERE key = $1',
      [req.params.key]
    );

    if (rows.length === 0) {
      logger.warn('Toggle not found', { key: req.params.key });
      return res.status(404).json({ error: 'Toggle not found' });
    }

    logger.debug('Toggle retrieved', { key: req.params.key });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Update toggle
router.put('/:id', writeLimiter, updateToggleValidation, validate, async (req, res, next) => {
  try {
    const { enabled, config } = req.body;

    const { rows } = await pool.query(
      `UPDATE feature_toggles SET
        enabled = COALESCE($1, enabled),
        config = COALESCE($2, config),
        updated_at = NOW()
      WHERE id = $3 RETURNING *`,
      [enabled, config ? JSON.stringify(config) : null, req.params.id]
    );

    if (rows.length === 0) {
      logger.warn('Toggle not found for update', { id: req.params.id });
      return res.status(404).json({ error: 'Toggle not found' });
    }

    logger.info('Toggle updated', {
      id: rows[0].id,
      key: rows[0].key,
      enabled: rows[0].enabled,
    });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Create toggle
router.post('/', writeLimiter, createToggleValidation, validate, async (req, res, next) => {
  try {
    const { key, label, description, enabled, config } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO feature_toggles (key, label, description, enabled, config)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [key, label, description || null, enabled || false, config || {}]
    );

    logger.info('Toggle created', {
      id: rows[0].id,
      key: rows[0].key,
      enabled: rows[0].enabled,
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
