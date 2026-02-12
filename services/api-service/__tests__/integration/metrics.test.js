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

describe('POST /api/events', () => {
  test('ingests a valid event', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({
        visitor_id: 'v-100',
        experiment_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        variant_id: '11111111-aaaa-bbbb-cccc-dddddddddddd',
        event_type: 'page_view',
        page_url: '/',
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.event_type).toBe('page_view');
    expect(res.body.visitor_id).toBe('v-100');
  });

  test('rejects missing visitor_id', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({ event_type: 'page_view' });
    expect(res.status).toBe(400);
  });

  test('rejects missing event_type', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({ visitor_id: 'v-101' });
    expect(res.status).toBe(400);
  });

  test('accepts event with minimal fields', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({ visitor_id: 'v-102', event_type: 'cta_click' });
    expect(res.status).toBe(201);
    expect(res.body.experiment_id).toBeNull();
  });

  test('accepts event_data as JSON', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({
        visitor_id: 'v-100',
        experiment_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        variant_id: '11111111-aaaa-bbbb-cccc-dddddddddddd',
        event_type: 'cta_click',
        event_data: { location: 'hero', button: 'primary' },
      });
    expect(res.status).toBe(201);
    expect(res.body.event_data).toEqual({ location: 'hero', button: 'primary' });
  });
});

describe('GET /api/events', () => {
  test('returns events with default pagination', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('filters by event_type', async () => {
    const res = await request(app).get('/api/events?event_type=cta_click');
    expect(res.status).toBe(200);
    for (const event of res.body) {
      expect(event.event_type).toBe('cta_click');
    }
  });

  test('filters by visitor_id', async () => {
    const res = await request(app).get('/api/events?visitor_id=v-100');
    expect(res.status).toBe(200);
    for (const event of res.body) {
      expect(event.visitor_id).toBe('v-100');
    }
  });

  test('respects limit parameter', async () => {
    const res = await request(app).get('/api/events?limit=1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/events/stats', () => {
  test('returns aggregated stats for an experiment', async () => {
    const res = await request(app)
      .get('/api/events/stats?experiment_id=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('breakdown');
    expect(res.body).toHaveProperty('totals');
    expect(res.body).toHaveProperty('timeline');
    expect(Array.isArray(res.body.breakdown)).toBe(true);
    expect(res.body.breakdown.length).toBeGreaterThan(0);

    // Verify shape of breakdown entries
    const entry = res.body.breakdown[0];
    expect(entry).toHaveProperty('variant_name');
    expect(entry).toHaveProperty('event_type');
    expect(entry).toHaveProperty('event_count');
    expect(entry).toHaveProperty('unique_visitors');
  });

  test('returns 400 when experiment_id is missing', async () => {
    const res = await request(app).get('/api/events/stats');
    expect(res.status).toBe(400);
  });

  test('returns empty arrays for experiment with no events', async () => {
    // Create a fresh experiment with no events
    const expRes = await request(app)
      .post('/api/experiments')
      .send({ name: 'empty_stats_exp' });
    const expId = expRes.body.id;

    const res = await request(app).get(`/api/events/stats?experiment_id=${expId}`);
    expect(res.status).toBe(200);
    expect(res.body.breakdown).toEqual([]);
    expect(res.body.totals).toEqual([]);
  });
});
