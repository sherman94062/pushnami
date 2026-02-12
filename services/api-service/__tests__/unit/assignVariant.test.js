const { assignVariant } = require('../../src/utils/assignVariant');

describe('assignVariant', () => {
  const experimentId = 'exp-001';

  const twoVariants = [
    { id: 'v1', name: 'control', weight: '0.5000', config: { layout: 'default' } },
    { id: 'v2', name: 'variant_b', weight: '0.5000', config: { layout: 'centered' } },
  ];

  test('returns a variant object', () => {
    const result = assignVariant('visitor-1', experimentId, twoVariants);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('config');
  });

  test('is deterministic — same inputs always produce same output', () => {
    const result1 = assignVariant('visitor-abc', experimentId, twoVariants);
    const result2 = assignVariant('visitor-abc', experimentId, twoVariants);
    const result3 = assignVariant('visitor-abc', experimentId, twoVariants);
    expect(result1.id).toBe(result2.id);
    expect(result2.id).toBe(result3.id);
  });

  test('different visitors can get different variants', () => {
    // With enough visitors, we should see both variants assigned
    const assignments = new Set();
    for (let i = 0; i < 100; i++) {
      const result = assignVariant(`visitor-${i}`, experimentId, twoVariants);
      assignments.add(result.id);
    }
    expect(assignments.size).toBe(2);
  });

  test('different experiments can assign same visitor differently', () => {
    const assignments = new Set();
    for (let i = 0; i < 50; i++) {
      const result = assignVariant('same-visitor', `exp-${i}`, twoVariants);
      assignments.add(result.id);
    }
    // With 50 different experiments, we should see both variants
    expect(assignments.size).toBe(2);
  });

  test('handles single variant', () => {
    const singleVariant = [
      { id: 'v1', name: 'only_one', weight: '1.0000', config: {} },
    ];
    const result = assignVariant('any-visitor', experimentId, singleVariant);
    expect(result.id).toBe('v1');
  });

  test('respects unequal weights', () => {
    const unequalVariants = [
      { id: 'v1', name: 'heavy', weight: '0.9000', config: {} },
      { id: 'v2', name: 'light', weight: '0.1000', config: {} },
    ];

    let heavyCount = 0;
    const total = 1000;
    for (let i = 0; i < total; i++) {
      const result = assignVariant(`weight-test-${i}`, experimentId, unequalVariants);
      if (result.id === 'v1') heavyCount++;
    }

    // With 90/10 weights, heavy should get roughly 900 out of 1000
    // Allow generous tolerance for hash distribution
    expect(heavyCount).toBeGreaterThan(800);
    expect(heavyCount).toBeLessThan(980);
  });

  test('handles three variants with equal weights', () => {
    const threeVariants = [
      { id: 'v1', name: 'a', weight: '0.3333', config: {} },
      { id: 'v2', name: 'b', weight: '0.3333', config: {} },
      { id: 'v3', name: 'c', weight: '0.3334', config: {} },
    ];

    const counts = { v1: 0, v2: 0, v3: 0 };
    const total = 1000;
    for (let i = 0; i < total; i++) {
      const result = assignVariant(`three-way-${i}`, experimentId, threeVariants);
      counts[result.id]++;
    }

    // Each should get roughly 333 out of 1000
    for (const id of ['v1', 'v2', 'v3']) {
      expect(counts[id]).toBeGreaterThan(250);
      expect(counts[id]).toBeLessThan(420);
    }
  });

  test('handles numeric weight values (not just strings)', () => {
    const numericWeights = [
      { id: 'v1', name: 'a', weight: 0.5, config: {} },
      { id: 'v2', name: 'b', weight: 0.5, config: {} },
    ];
    const result = assignVariant('visitor-1', experimentId, numericWeights);
    expect(['v1', 'v2']).toContain(result.id);
  });

  test('normalizes weights that do not sum to 1', () => {
    const unnormalized = [
      { id: 'v1', name: 'a', weight: '3', config: {} },
      { id: 'v2', name: 'b', weight: '7', config: {} },
    ];

    let v2Count = 0;
    const total = 1000;
    for (let i = 0; i < total; i++) {
      const result = assignVariant(`norm-${i}`, experimentId, unnormalized);
      if (result.id === 'v2') v2Count++;
    }

    // v2 has weight 7/10 = 70%, should get roughly 700
    expect(v2Count).toBeGreaterThan(600);
    expect(v2Count).toBeLessThan(800);
  });
});
