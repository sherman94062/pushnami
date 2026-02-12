const { test, expect } = require('@playwright/test');

const API_BASE = 'http://localhost:4000';

test.describe('Landing Page', () => {
  test('renders with variant-specific content', async ({ page }) => {
    await page.goto('/');

    // Page should have a hero section with an h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    const title = await h1.textContent();
    // Should be one of the two variant titles
    expect(['Grow Your Audience', 'Reach More Customers Today']).toContain(title);
  });

  test('renders the features section', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.features')).toBeVisible();
    await expect(page.locator('.feature-card')).toHaveCount(3);
  });

  test('renders testimonials when toggle is enabled', async ({ page }) => {
    // Verify the show_testimonials toggle is on (it is by default from seed)
    const togglesRes = await fetch(`${API_BASE}/api/toggles/show_testimonials`);
    const toggle = await togglesRes.json();

    await page.goto('/');

    if (toggle.enabled) {
      await expect(page.locator('.testimonials')).toBeVisible();
      await expect(page.locator('.testimonial-card')).toHaveCount(3);
    } else {
      await expect(page.locator('.testimonials')).not.toBeVisible();
    }
  });

  test('renders the promotional banner when toggle is enabled', async ({ page }) => {
    const togglesRes = await fetch(`${API_BASE}/api/toggles/show_banner`);
    const toggle = await togglesRes.json();

    await page.goto('/');

    if (toggle.enabled) {
      await expect(page.locator('.promo-banner')).toBeVisible();
    } else {
      await expect(page.locator('.promo-banner')).not.toBeVisible();
    }
  });

  test('sets a visitor_id cookie', async ({ page }) => {
    await page.goto('/');

    // Wait for client-side JS to set the cookie
    await page.waitForTimeout(1000);

    const cookies = await page.context().cookies();
    const visitorCookie = cookies.find((c) => c.name === 'visitor_id');
    expect(visitorCookie).toBeDefined();
    expect(visitorCookie.value).toBeTruthy();
  });

  test('same visitor gets same variant on repeat visits', async ({ page }) => {
    await page.goto('/');
    const title1 = await page.locator('h1').textContent();

    await page.goto('/');
    const title2 = await page.locator('h1').textContent();

    expect(title1).toBe(title2);
  });

  test('tracks page_view event on load', async ({ page }) => {
    // Clear events first
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check that events were created via the API
    const res = await fetch(`${API_BASE}/api/events?event_type=page_view&limit=1`);
    const events = await res.json();

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].event_type).toBe('page_view');
  });

  test('tracks CTA click event', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Get visitor ID from cookie
    const cookies = await page.context().cookies();
    const visitorId = cookies.find((c) => c.name === 'visitor_id')?.value;

    // Click the CTA button
    await page.locator('.cta-button').first().click();
    await page.waitForTimeout(1000);

    // Verify event was tracked
    const res = await fetch(`${API_BASE}/api/events?event_type=cta_click&visitor_id=${visitorId}&limit=1`);
    const events = await res.json();

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].event_type).toBe('cta_click');
    expect(events[0].visitor_id).toBe(visitorId);
  });
});
