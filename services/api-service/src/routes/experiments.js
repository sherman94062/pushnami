const { Router } = require('express');
const { pool } = require('../db');
const { assignVariant } = require('../utils/assignVariant');

const router = Router();

// Assign visitor to variant — must be before /:id to avoid matching "assign" as an ID
router.get('/assign', async (req, res, next) => {
  try {
    const { visitor_id, experiment_name } = req.query;
    if (!visitor_id || !experiment_name) {
      return res
        .status(400)
        .json({ error: 'visitor_id and experiment_name are required' });
    }

    // Look up experiment by name
    const { rows: expRows } = await pool.query(
      'SELECT * FROM experiments WHERE name = $1',
      [experiment_name]
    );
    if (expRows.length === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    const experiment = expRows[0];

    if (!experiment.is_active) {
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
      return res.status(404).json({ error: 'Experiment not found' });
    }
    const { rows: variants } = await pool.query(
      'SELECT * FROM variants WHERE experiment_id = $1 ORDER BY name',
      [req.params.id]
    );
    res.json({ ...rows[0], variants });
  } catch (err) {
    next(err);
  }
});

// Create experiment
router.post('/', async (req, res, next) => {
  try {
    const { name, description, is_active } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO experiments (name, description, is_active) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), description || null, is_active !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Update experiment
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE experiments SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
      WHERE id = $4 RETURNING *`,
      [name, description, is_active, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Add variant to experiment
router.post('/:id/variants', async (req, res, next) => {
  try {
    const { name, weight, config } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO variants (experiment_id, name, weight, config) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, name.trim(), weight || 0.5, config || {}]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
