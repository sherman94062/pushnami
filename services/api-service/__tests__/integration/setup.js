/**
 * Integration test setup — connects to the running Postgres instance
 * and provides helpers for test lifecycle.
 *
 * Expects DATABASE_URL to be set, or defaults to the Docker Compose Postgres.
 */
const { pool } = require('../../src/db');

async function cleanDatabase() {
  await pool.query('DELETE FROM events');
  await pool.query('DELETE FROM assignments');
  await pool.query('DELETE FROM variants');
  await pool.query('DELETE FROM experiments');
  await pool.query('DELETE FROM feature_toggles');
}

async function seedDatabase() {
  // Insert test experiment
  await pool.query(`
    INSERT INTO experiments (id, name, description, is_active) VALUES
      ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'test_experiment', 'Test experiment', true)
  `);

  // Insert test variants
  await pool.query(`
    INSERT INTO variants (id, experiment_id, name, weight, config) VALUES
      ('11111111-aaaa-bbbb-cccc-dddddddddddd', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'control', 0.5000,
       '{"hero_title": "Control Title", "cta_text": "Click Me"}'),
      ('22222222-aaaa-bbbb-cccc-dddddddddddd', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'variant_b', 0.5000,
       '{"hero_title": "Variant Title", "cta_text": "Try Now"}')
  `);

  // Insert test toggles
  await pool.query(`
    INSERT INTO feature_toggles (id, key, label, description, enabled, config) VALUES
      ('ffffffff-0000-1111-2222-333333333333', 'test_toggle', 'Test Toggle', 'A test toggle', false, '{}'),
      ('ffffffff-0000-1111-2222-444444444444', 'banner_toggle', 'Banner', 'Banner toggle', true, '{"text": "Hello"}')
  `);
}

async function closePool() {
  await pool.end();
}

module.exports = { pool, cleanDatabase, seedDatabase, closePool };
