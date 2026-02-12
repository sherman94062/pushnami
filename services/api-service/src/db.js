const { Pool } = require('pg');
const config = require('./config');
const logger = require('./utils/logger');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000, // 30 second query timeout
  query_timeout: 30000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('remove', () => {
  logger.debug('Database connection removed from pool');
});

module.exports = { pool };
