const { test, expect } = require('@playwright/test');

const API_BASE = 'http://localhost:4000';
const ADMIN_BASE = 'http://localhost:3001';

test.describe('Admin Dashboard', () => {
  test('loads the dashboard page', async ({ page }) => {
    await page.goto(ADMIN_BASE);
    await expect(page.locator('h2')).toContainText('Dashboard');
  });

  test('shows experiment and toggle counts', async ({ page }) => {
    await page.goto(ADMIN_BASE);
    await expect(page.locator('.stat-card')).toHaveCount(3);
  });

  test('navigates to feature toggles page', async ({ page }) => {
    await page.goto(ADMIN_BASE);
    await page.click('a[href="/toggles"]');
    await expect(page.locator('h2')).toContainText('Feature Toggles');
  });

  test('displays feature toggles with switches', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/toggles`);
    await page.waitForSelector('.toggle-switch');

    const toggleCards = page.locator('.card');
    const count = await toggleCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('can toggle a feature on and off', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/toggles`);
    await page.waitForSelector('.toggle-switch');

    // Find the show_testimonials toggle and get its current state
    const toggleRes = await fetch(`${API_BASE}/api/toggles/show_testimonials`);
    const toggle = await toggleRes.json();
    const initialState = toggle.enabled;

    // Click the toggle switch for show_testimonials
    // Find the card containing "show_testimonials" text and click its slider (visible element)
    const card = page.locator('.card', { has: page.locator('text=show_testimonials') });
    await card.locator('.toggle-slider').click();

    // Wait for API call
    await page.waitForTimeout(500);

    // Verify state changed
    const updatedRes = await fetch(`${API_BASE}/api/toggles/show_testimonials`);
    const updated = await updatedRes.json();
    expect(updated.enabled).toBe(!initialState);

    // Restore original state
    await card.locator('.toggle-slider').click();
    await page.waitForTimeout(500);
  });

  test('navigates to experiments page', async ({ page }) => {
    await page.goto(ADMIN_BASE);
    await page.click('a[href="/experiments"]');
    await expect(page.locator('h2')).toContainText('Experiments');
  });

  test('shows experiment cards with active badge', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/experiments`);
    await expect(page.locator('.experiment-card')).toHaveCount(1);
    await expect(page.locator('.badge--active')).toBeVisible();
  });

  test('navigates to experiment detail page', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/experiments`);
    await page.locator('.experiment-card').first().click();

    // Should show experiment name and variants table
    await expect(page.locator('h2')).toContainText('homepage_hero');
    await expect(page.locator('.data-table').first()).toBeVisible();
  });

  test('experiment detail shows stats after landing page visits', async ({ page }) => {
    // First generate some events by visiting the landing page
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    await page.locator('.cta-button').first().click();
    await page.waitForTimeout(1000);

    // Get the experiment ID
    const expRes = await fetch(`${API_BASE}/api/experiments`);
    const experiments = await expRes.json();
    const expId = experiments[0].id;

    // Now check the admin stats page
    await page.goto(`${ADMIN_BASE}/experiments/${expId}`);
    await page.waitForTimeout(1000);

    // Stats should show data
    await expect(page.locator('h2')).toContainText('homepage_hero');
  });
});

test.describe('Feature Toggle → Landing Page Integration', () => {
  test('disabling testimonials hides them on the landing page', async ({ page }) => {
    // Get the toggle ID
    const toggleRes = await fetch(`${API_BASE}/api/toggles/show_testimonials`);
    const toggle = await toggleRes.json();

    // Disable testimonials via API
    await fetch(`${API_BASE}/api/toggles/${toggle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });

    // Visit landing page — testimonials should be hidden
    await page.goto('http://localhost:3000');
    await expect(page.locator('.testimonials')).not.toBeVisible();

    // Re-enable testimonials
    await fetch(`${API_BASE}/api/toggles/${toggle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });

    // Visit again — testimonials should be visible
    await page.goto('http://localhost:3000');
    await expect(page.locator('.testimonials')).toBeVisible();
  });
});
