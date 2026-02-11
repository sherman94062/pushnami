const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

// List all toggles
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM feature_toggles ORDER BY key'
    );
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
      return res.status(404).json({ error: 'Toggle not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Update toggle
router.put('/:id', async (req, res, next) => {
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
      return res.status(404).json({ error: 'Toggle not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Create toggle
router.post('/', async (req, res, next) => {
  try {
    const { key, label, description, enabled, config } = req.body;
    if (!key || !label) {
      return res.status(400).json({ error: 'key and label are required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO feature_toggles (key, label, description, enabled, config)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [key, label, description || null, enabled || false, config || {}]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
