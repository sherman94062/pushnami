const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { pool } = require('./db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { requestTimeout } = require('./middleware/validation');
const experimentsRouter = require('./routes/experiments');
const metricsRouter = require('./routes/metrics');
const togglesRouter = require('./routes/toggles');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['http://localhost:3000', 'http://localhost:3001'] // In production, replace with actual domains
    : true, // Allow all in development
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser with size limit
app.use(express.json({ limit: '1mb' }));

// Request timeout
app.use(requestTimeout(30000)); // 30 seconds

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  next();
});

// Health check
app.get('/health', async (_req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const dbLatency = Date.now() - start;

    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };

    logger.debug('Health check passed', { dbLatency, poolStats });

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        latency: dbLatency,
        ...poolStats,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (err) {
    logger.error('Health check failed', { error: err.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
});

// API routes (versioned)
app.use('/api/v1/experiments', experimentsRouter);
app.use('/api/v1/events', metricsRouter);
app.use('/api/v1/toggles', togglesRouter);

// Legacy routes (for backward compatibility)
app.use('/api/experiments', experimentsRouter);
app.use('/api/events', metricsRouter);
app.use('/api/toggles', togglesRouter);

// 404 handler
app.use((_req, res) => {
  logger.warn('Route not found', { path: _req.path, method: _req.method });
  res.status(404).json({ error: 'Not found' });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
