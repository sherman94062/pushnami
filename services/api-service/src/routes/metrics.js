const { Router } = require('express');
const { body, query } = require('express-validator');
const { pool } = require('../db');
const logger = require('../utils/logger');
const { validate } = require('../middleware/validation');
const { eventLimiter } = require('../middleware/rateLimiter');

const router = Router();

// Validation rules for event ingestion
const eventValidation = [
  body('visitor_id').isString().trim().notEmpty().isLength({ max: 255 }),
  body('event_type')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .matches(/^[a-z_]+$/)
    .withMessage('event_type must contain only lowercase letters and underscores'),
  body('experiment_id').optional().isUUID(),
  body('variant_id').optional().isUUID(),
  body('event_data').optional().isObject(),
  body('page_url').optional().isString().isLength({ max: 2048 }),
];

// Ingest event (with strict rate limiting)
router.post('/', eventLimiter, eventValidation, validate, async (req, res, next) => {
  try {
    const { visitor_id, experiment_id, variant_id, event_type, event_data, page_url } =
      req.body;

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

    logger.debug('Event tracked', {
      visitor_id,
      event_type,
      experiment_id,
      variant_id,
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Get aggregated stats for an experiment
router.get(
  '/stats',
  [query('experiment_id').isUUID().withMessage('experiment_id must be a valid UUID')],
  validate,
  async (req, res, next) => {
    try {
      const { experiment_id } = req.query;

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

      logger.debug('Stats retrieved', {
        experiment_id,
        breakdown_count: breakdown.length,
        totals_count: totals.length,
      });

      res.json({ breakdown, totals, timeline });
    } catch (err) {
      next(err);
    }
  }
);

// List raw events with pagination and filters
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 }),
    query('experiment_id').optional().isUUID(),
    query('visitor_id').optional().isString().isLength({ max: 255 }),
    query('event_type').optional().isString().matches(/^[a-z_]+$/),
  ],
  validate,
  async (req, res, next) => {
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

      // Get total count for pagination
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*)::int AS total FROM events ${where}`,
        params.slice(2)
      );

      const { rows } = await pool.query(
        `SELECT * FROM events ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        params
      );

      logger.debug('Events listed', {
        count: rows.length,
        total: countRows[0].total,
        filters: { ...req.query },
      });

      res.json({
        events: rows,
        pagination: {
          limit,
          offset,
          total: countRows[0].total,
          hasMore: offset + rows.length < countRows[0].total,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
