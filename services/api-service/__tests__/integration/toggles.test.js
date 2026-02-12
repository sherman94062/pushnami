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

describe('GET /api/toggles', () => {
  test('returns all toggles', async () => {
    const res = await request(app).get('/api/toggles');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // Sorted by key
    expect(res.body[0].key).toBe('banner_toggle');
    expect(res.body[1].key).toBe('test_toggle');
  });
});

describe('GET /api/toggles/:key', () => {
  test('returns toggle by key', async () => {
    const res = await request(app).get('/api/toggles/test_toggle');
    expect(res.status).toBe(200);
    expect(res.body.key).toBe('test_toggle');
    expect(res.body.enabled).toBe(false);
  });

  test('returns 404 for nonexistent key', async () => {
    const res = await request(app).get('/api/toggles/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/toggles/:id', () => {
  test('toggles enabled state', async () => {
    const res = await request(app)
      .put('/api/toggles/ffffffff-0000-1111-2222-333333333333')
      .send({ enabled: true });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);

    // Verify persistence
    const check = await request(app).get('/api/toggles/test_toggle');
    expect(check.body.enabled).toBe(true);
  });

  test('updates config without changing enabled state', async () => {
    const res = await request(app)
      .put('/api/toggles/ffffffff-0000-1111-2222-444444444444')
      .send({ config: { text: 'Updated text', color: '#000' } });
    expect(res.status).toBe(200);
    expect(res.body.config).toEqual({ text: 'Updated text', color: '#000' });
    // enabled should still be true (from seed)
    expect(res.body.enabled).toBe(true);
  });

  test('returns 404 for nonexistent toggle', async () => {
    const res = await request(app)
      .put('/api/toggles/00000000-0000-0000-0000-000000000000')
      .send({ enabled: false });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/toggles', () => {
  test('creates a new toggle', async () => {
    const res = await request(app)
      .post('/api/toggles')
      .send({
        key: 'new_toggle',
        label: 'New Toggle',
        description: 'A fresh toggle',
        enabled: true,
        config: { value: 42 },
      });
    expect(res.status).toBe(201);
    expect(res.body.key).toBe('new_toggle');
    expect(res.body.enabled).toBe(true);
    expect(res.body.config).toEqual({ value: 42 });
  });

  test('rejects duplicate key', async () => {
    const res = await request(app)
      .post('/api/toggles')
      .send({ key: 'test_toggle', label: 'Duplicate' });
    expect(res.status).toBe(409);
  });

  test('rejects missing key or label', async () => {
    const res = await request(app)
      .post('/api/toggles')
      .send({ key: 'only_key' });
    expect(res.status).toBe(400);
  });
});
