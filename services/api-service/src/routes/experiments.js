const { Router } = require('express');
const { body, query } = require('express-validator');
const { pool } = require('../db');
const logger = require('../utils/logger');
const { assignVariant } = require('../utils/assignVariant');
const { validate } = require('../middleware/validation');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = Router();

// Validation rules
const assignValidation = [
  query('visitor_id').isString().trim().notEmpty().isLength({ max: 255 }),
  query('experiment_name').isString().trim().notEmpty().isLength({ max: 255 }),
];

const createExperimentValidation = [
  body('name').isString().trim().notEmpty().isLength({ min: 1, max: 255 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('is_active').optional().isBoolean(),
];

const updateExperimentValidation = [
  body('name').optional().isString().trim().notEmpty().isLength({ min: 1, max: 255 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('is_active').optional().isBoolean(),
];

const createVariantValidation = [
  body('name').isString().trim().notEmpty().isLength({ min: 1, max: 255 }),
  body('weight').optional().isFloat({ min: 0, max: 1 }),
  body('config').optional().isObject(),
];

// Assign visitor to variant — must be before /:id to avoid matching "assign" as an ID
router.get('/assign', assignValidation, validate, async (req, res, next) => {
  try {
    const { visitor_id, experiment_name } = req.query;

    // Look up experiment by name
    const { rows: expRows } = await pool.query(
      'SELECT * FROM experiments WHERE name = $1',
      [experiment_name]
    );

    if (expRows.length === 0) {
      logger.warn('Experiment not found', { experiment_name, visitor_id });
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const experiment = expRows[0];

    if (!experiment.is_active) {
      logger.debug('Experiment inactive', { experiment_name, visitor_id });
      return res.json({
        experiment_id: experiment.id,
        experiment_name: experiment.name,
        variant_id: null,
        variant: null,
        message: 'Experiment is inactive',
      });
    }

    // Check for existing assignment
    const { rows: existingRows } = await pool.query(
      `SELECT a.*, v.name AS variant_name, v.config AS variant_config
       FROM assignments a
       JOIN variants v ON a.variant_id = v.id
       WHERE a.experiment_id = $1 AND a.visitor_id = $2`,
      [experiment.id, visitor_id]
    );

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      logger.debug('Returning existing assignment', {
        experiment_name,
        visitor_id,
        variant_name: existing.variant_name,
      });
      return res.json({
        experiment_id: experiment.id,
        experiment_name: experiment.name,
        variant_id: existing.variant_id,
        variant: {
          id: existing.variant_id,
          name: existing.variant_name,
          config: existing.variant_config,
        },
      });
    }

    // Fetch variants and assign deterministically
    const { rows: variants } = await pool.query(
      'SELECT * FROM variants WHERE experiment_id = $1 ORDER BY name',
      [experiment.id]
    );

    if (variants.length === 0) {
      logger.error('No variants configured', { experiment_name, experiment_id: experiment.id });
      return res.status(404).json({ error: 'No variants configured for this experiment' });
    }

    const chosen = assignVariant(visitor_id, experiment.id, variants);

    // Insert with ON CONFLICT for race condition safety
    await pool.query(
      `INSERT INTO assignments (experiment_id, visitor_id, variant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (experiment_id, visitor_id) DO NOTHING`,
      [experiment.id, visitor_id, chosen.id]
    );

    // Re-read to handle race condition (another request may have inserted first)
    const { rows: finalRows } = await pool.query(
      `SELECT a.*, v.name AS variant_name, v.config AS variant_config
       FROM assignments a
       JOIN variants v ON a.variant_id = v.id
       WHERE a.experiment_id = $1 AND a.visitor_id = $2`,
      [experiment.id, visitor_id]
    );

    const final = finalRows[0];
    logger.info('New variant assignment', {
      experiment_name,
      visitor_id,
      variant_name: final.variant_name,
    });

    res.json({
      experiment_id: experiment.id,
      experiment_name: experiment.name,
      variant_id: final.variant_id,
      variant: {
        id: final.variant_id,
        name: final.variant_name,
        config: final.variant_config,
      },
    });
  } catch (err) {
    next(err);
  }
});

// List all experiments with their variants
router.get('/', async (req, res, next) => {
  try {
    const { rows: experiments } = await pool.query(
      'SELECT * FROM experiments ORDER BY created_at DESC'
    );
    const { rows: variants } = await pool.query(
      'SELECT * FROM variants ORDER BY experiment_id, name'
    );

    const variantsByExp = {};
    for (const v of variants) {
      if (!variantsByExp[v.experiment_id]) variantsByExp[v.experiment_id] = [];
      variantsByExp[v.experiment_id].push(v);
    }

    const result = experiments.map((exp) => ({
      ...exp,
      variants: variantsByExp[exp.id] || [],
    }));

    logger.debug('Experiments listed', { count: experiments.length });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get single experiment
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM experiments WHERE id = $1', [
      req.params.id,
    ]);

    if (rows.length === 0) {
      logger.warn('Experiment not found', { id: req.params.id });
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const { rows: variants } = await pool.query(
      'SELECT * FROM variants WHERE experiment_id = $1 ORDER BY name',
      [req.params.id]
    );

    logger.debug('Experiment retrieved', { id: req.params.id, name: rows[0].name });
    res.json({ ...rows[0], variants });
  } catch (err) {
    next(err);
  }
});

// Create experiment
router.post('/', writeLimiter, createExperimentValidation, validate, async (req, res, next) => {
  try {
    const { name, description, is_active } = req.body;

    const { rows } = await pool.query(
      'INSERT INTO experiments (name, description, is_active) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), description || null, is_active !== false]
    );

    logger.info('Experiment created', { id: rows[0].id, name: rows[0].name });
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Update experiment
router.put('/:id', writeLimiter, updateExperimentValidation, validate, async (req, res, next) => {
  try {
    const { name, description, is_active } = req.body;

    const { rows } = await pool.query(
      `UPDATE experiments SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
      WHERE id = $4 RETURNING *`,
      [name?.trim(), description, is_active, req.params.id]
    );

    if (rows.length === 0) {
      logger.warn('Experiment not found for update', { id: req.params.id });
      return res.status(404).json({ error: 'Experiment not found' });
    }

    logger.info('Experiment updated', { id: rows[0].id, name: rows[0].name });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Add variant to experiment
router.post('/:id/variants', writeLimiter, createVariantValidation, validate, async (req, res, next) => {
  try {
    const { name, weight, config } = req.body;

    const { rows } = await pool.query(
      'INSERT INTO variants (experiment_id, name, weight, config) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, name.trim(), weight || 0.5, config || {}]
    );

    logger.info('Variant created', {
      experiment_id: req.params.id,
      variant_id: rows[0].id,
      name: rows[0].name,
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
