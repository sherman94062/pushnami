const request = require('supertest');
const app = require('../../src/app');
const { pool, cleanDatabase, seedDatabase, closePool } = require('./setup');

beforeAll(async () => {
  await cleanDatabase();
  await seedDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await closePool();
});

describe('GET /api/experiments', () => {
  test('returns list of experiments with variants', async () => {
    const res = await request(app).get('/api/experiments');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('test_experiment');
    expect(res.body[0].variants).toHaveLength(2);
  });
});

describe('GET /api/experiments/:id', () => {
  test('returns experiment with variants', async () => {
    const res = await request(app).get('/api/experiments/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('test_experiment');
    expect(res.body.variants).toHaveLength(2);
  });

  test('returns 404 for nonexistent experiment', async () => {
    const res = await request(app).get('/api/experiments/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/experiments', () => {
  test('creates a new experiment', async () => {
    const res = await request(app)
      .post('/api/experiments')
      .send({ name: 'new_experiment', description: 'A new one' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('new_experiment');
    expect(res.body.is_active).toBe(true);
    expect(res.body.id).toBeDefined();
  });

  test('rejects duplicate name', async () => {
    const res = await request(app)
      .post('/api/experiments')
      .send({ name: 'test_experiment' });
    expect(res.status).toBe(409);
  });

  test('rejects missing name', async () => {
    const res = await request(app)
      .post('/api/experiments')
      .send({ description: 'no name' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/experiments/:id', () => {
  test('updates experiment', async () => {
    const res = await request(app)
      .put('/api/experiments/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
      .send({ is_active: false });
    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);

    // Restore for other tests
    await request(app)
      .put('/api/experiments/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
      .send({ is_active: true });
  });
});

describe('POST /api/experiments/:id/variants', () => {
  test('adds a variant to an experiment', async () => {
    const res = await request(app)
      .post('/api/experiments/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/variants')
      .send({ name: 'variant_c', weight: 0.3, config: { layout: 'minimal' } });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('variant_c');
    expect(res.body.experiment_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  test('rejects duplicate variant name in same experiment', async () => {
    const res = await request(app)
      .post('/api/experiments/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/variants')
      .send({ name: 'control' });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/experiments/assign', () => {
  test('assigns a visitor to a variant deterministically', async () => {
    const res1 = await request(app)
      .get('/api/experiments/assign?visitor_id=test-visitor-1&experiment_name=test_experiment');
    expect(res1.status).toBe(200);
    expect(res1.body.variant).toBeDefined();
    expect(res1.body.variant.config).toBeDefined();
    expect(res1.body.experiment_name).toBe('test_experiment');

    // Same visitor gets same variant
    const res2 = await request(app)
      .get('/api/experiments/assign?visitor_id=test-visitor-1&experiment_name=test_experiment');
    expect(res2.body.variant_id).toBe(res1.body.variant_id);
  });

  test('returns 400 when missing params', async () => {
    const res = await request(app).get('/api/experiments/assign?visitor_id=test');
    expect(res.status).toBe(400);
  });

  test('returns 404 for nonexistent experiment', async () => {
    const res = await request(app)
      .get('/api/experiments/assign?visitor_id=test&experiment_name=nope');
    expect(res.status).toBe(404);
  });

  test('returns null variant for inactive experiment', async () => {
    // Deactivate
    await request(app)
      .put('/api/experiments/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
      .send({ is_active: false });

    const res = await request(app)
      .get('/api/experiments/assign?visitor_id=inactive-test&experiment_name=test_experiment');
    expect(res.status).toBe(200);
    expect(res.body.variant).toBeNull();

    // Restore
    await request(app)
      .put('/api/experiments/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
      .send({ is_active: true });
  });
});
