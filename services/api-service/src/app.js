const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { pool } = require('./db');
const errorHandler = require('./middleware/errorHandler');
const experimentsRouter = require('./routes/experiments');
const metricsRouter = require('./routes/metrics');
const togglesRouter = require('./routes/toggles');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// Routes
app.use('/api/experiments', experimentsRouter);
app.use('/api/events', metricsRouter);
app.use('/api/toggles', togglesRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
