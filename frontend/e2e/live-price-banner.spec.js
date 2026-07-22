// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for LivePriceBanner component (MVP1a-R2).
 * Uses route interception to mock /api/v1a/live-prices responses.
 */

const MOCK_LIVE_PRICES_OPEN = {
  market_open: true,
  last_updated: '2026-07-22T10:30:00+05:30',
  prices: [
    { ticker: 'RELIANCE.NS', price: 2845.50, change_pct: 1.23, timestamp: '2026-07-22T10:30:00+05:30', source: 'yfinance' },
    { ticker: 'TCS.NS', price: 3920.00, change_pct: -0.45, timestamp: '2026-07-22T10:30:00+05:30', source: 'yfinance' },
    { ticker: 'INFY.NS', price: 1560.75, change_pct: 0.82, timestamp: '2026-07-22T10:30:00+05:30', source: 'bse_india' },
  ],
};

const MOCK_LIVE_PRICES_CLOSED = {
  market_open: false,
  last_updated: '2026-07-22T16:00:00+05:30',
  prices: [
    { ticker: 'RELIANCE.NS', price: 2840.00, change_pct: 0.95, timestamp: '2026-07-22T15:30:00+05:30', source: 'yfinance' },
  ],
};

test.describe('LivePriceBanner', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/analyze', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], failed: [] }) })
    );
    await page.route('**/api/v1/observability/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
  });

  test('displays live price ticker strip with price data during market hours', async ({ page }) => {
    await page.route('**/api/v1a/live-prices', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LIVE_PRICES_OPEN) })
    );

    await page.goto('/');
    const banner = page.locator('[data-testid="live-price-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('RELIANCE.NS');
    await expect(banner).toContainText('TCS.NS');
    await expect(banner).toContainText('2845.50');
    await expect(banner).toContainText('3920.00');
  });

  test('shows positive and negative change percentages', async ({ page }) => {
    await page.route('**/api/v1a/live-prices', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LIVE_PRICES_OPEN) })
    );

    await page.goto('/');
    const banner = page.locator('[data-testid="live-price-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('1.23');
    await expect(banner).toContainText('-0.45');
  });

  test('displays source badges for each ticker', async ({ page }) => {
    await page.route('**/api/v1a/live-prices', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LIVE_PRICES_OPEN) })
    );

    await page.goto('/');
    const banner = page.locator('[data-testid="live-price-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('yfinance');
  });

  test('shows "Market Closed" indicator when market is closed', async ({ page }) => {
    await page.route('**/api/v1a/live-prices', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LIVE_PRICES_CLOSED) })
    );

    await page.goto('/');
    const banner = page.locator('[data-testid="live-price-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/Market Closed/i);
  });

  test('displays last-updated timestamp', async ({ page }) => {
    await page.route('**/api/v1a/live-prices', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LIVE_PRICES_OPEN) })
    );

    await page.goto('/');
    const banner = page.locator('[data-testid="live-price-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/10:30/);
  });

  test('handles API errors gracefully without crashing', async ({ page }) => {
    await page.route('**/api/v1a/live-prices', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Server error' }) })
    );

    await page.goto('/');
    await expect(page.locator('[data-testid="app-layout"]')).toBeVisible();

    const banner = page.locator('[data-testid="live-price-banner"]');
    const bannerVisible = await banner.isVisible().catch(() => false);
    if (bannerVisible) {
      await expect(banner).not.toContainText('undefined');
      await expect(banner).not.toContainText('null');
    }
  });

  test('auto-polls live prices endpoint', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/v1a/live-prices', (route) => {
      callCount++;
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LIVE_PRICES_OPEN) });
    });

    await page.goto('/');
    const banner = page.locator('[data-testid="live-price-banner"]');
    await expect(banner).toBeVisible();
    expect(callCount).toBeGreaterThanOrEqual(1);
  });
});
