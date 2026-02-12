const config = require('./config');
const { pool } = require('./db');
const app = require('./app');

const server = app.listen(config.port, () => {
  console.log(`API service listening on port ${config.port}`);
});

// Graceful shutdown
function shutdown() {
  console.log('Shutting down...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
