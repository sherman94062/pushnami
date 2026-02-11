const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

// Ingest event
router.post('/', async (req, res, next) => {
  try {
    const { visitor_id, experiment_id, variant_id, event_type, event_data, page_url } =
      req.body;

    if (!visitor_id || typeof visitor_id !== 'string') {
      return res.status(400).json({ error: 'visitor_id is required' });
    }
    if (!event_type || typeof event_type !== 'string') {
      return res.status(400).json({ error: 'event_type is required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO events (visitor_id, experiment_id, variant_id, event_type, event_data, page_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        visitor_id,
        experiment_id || null,
        variant_id || null,
        event_type,
        event_data || {},
        page_url || null,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Get aggregated stats for an experiment
router.get('/stats', async (req, res, next) => {
  try {
    const { experiment_id } = req.query;
    if (!experiment_id) {
      return res.status(400).json({ error: 'experiment_id is required' });
    }

    // Per-variant, per-event-type breakdown
    const { rows: breakdown } = await pool.query(
      `SELECT
        v.name AS variant_name,
        v.id AS variant_id,
        e.event_type,
        COUNT(*)::int AS event_count,
        COUNT(DISTINCT e.visitor_id)::int AS unique_visitors
      FROM events e
      JOIN variants v ON e.variant_id = v.id
      WHERE e.experiment_id = $1
      GROUP BY v.id, v.name, e.event_type
      ORDER BY v.name, e.event_type`,
      [experiment_id]
    );

    // Total unique visitors per variant
    const { rows: totals } = await pool.query(
      `SELECT
        v.name AS variant_name,
        v.id AS variant_id,
        COUNT(DISTINCT e.visitor_id)::int AS total_visitors,
        COUNT(*)::int AS total_events
      FROM events e
      JOIN variants v ON e.variant_id = v.id
      WHERE e.experiment_id = $1
      GROUP BY v.id, v.name
      ORDER BY v.name`,
      [experiment_id]
    );

    // Events over time (last 24 hours, bucketed by hour)
    const { rows: timeline } = await pool.query(
      `SELECT
        v.name AS variant_name,
        date_trunc('hour', e.created_at) AS hour,
        COUNT(*)::int AS event_count
      FROM events e
      JOIN variants v ON e.variant_id = v.id
      WHERE e.experiment_id = $1
        AND e.created_at > NOW() - INTERVAL '24 hours'
      GROUP BY v.name, date_trunc('hour', e.created_at)
      ORDER BY hour, v.name`,
      [experiment_id]
    );

    res.json({ breakdown, totals, timeline });
  } catch (err) {
    next(err);
  }
});

// List raw events with pagination
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;

    const params = [limit, offset];
    const conditions = [];
    let paramIndex = 3;

    if (req.query.experiment_id) {
      conditions.push(`experiment_id = $${paramIndex++}`);
      params.push(req.query.experiment_id);
    }
    if (req.query.event_type) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(req.query.event_type);
    }
    if (req.query.visitor_id) {
      conditions.push(`visitor_id = $${paramIndex++}`);
      params.push(req.query.visitor_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT * FROM events ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      params
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
