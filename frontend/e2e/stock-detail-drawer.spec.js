// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for StockDetailDrawer (MVP1 — Requirement 6).
 * Uses route interception to mock API responses.
 */

const MOCK_ANALYSIS_RESPONSE = {
  results: [
    {
      ticker: 'RELIANCE.NS',
      bullish_score: 85,
      confidence: 'High',
      sub_scores: { rsi: 18, macd: 16, bollinger: 17, moving_avg: 20, volume: 14 },
      projected_lower: 2700,
      projected_upper: 3100,
    },
    {
      ticker: 'TCS.NS',
      bullish_score: 62,
      confidence: 'Medium',
      sub_scores: { rsi: 12, macd: 14, bollinger: 10, moving_avg: 16, volume: 10 },
      projected_lower: 3600,
      projected_upper: 4000,
    },
  ],
  failed: [],
};

const MOCK_TICKER_DETAIL = {
  ticker: 'RELIANCE.NS',
  bullish_score: 85,
  confidence: 'High',
  sub_scores: { rsi: 18, macd: 16, bollinger: 17, moving_avg: 20, volume: 14 },
  projected_lower: 2700,
  projected_upper: 3100,
  indicators: {
    rsi: 28.5,
    macd_line: 12.3,
    macd_signal: 10.1,
    macd_histogram: 2.2,
    bb_upper: 3100,
    bb_middle: 2900,
    bb_lower: 2700,
    sma_50: 2850,
    sma_200: 2750,
    ema_12: 2880,
    ema_26: 2830,
    volume_5d_avg: 8500000,
    volume_20d_avg: 7000000,
  },
  price_history: Array.from({ length: 90 }, (_, i) => ({
    date: `2026-${String(Math.floor(i / 30) + 4).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
    close: 2700 + Math.random() * 400,
    sma_50: 2800 + i * 0.5,
    sma_200: 2750 + i * 0.3,
  })),
};

test.describe('StockDetailDrawer — MVP1 Detail Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/analyze', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ANALYSIS_RESPONSE),
      })
    );
    await page.route('**/api/v1/ticker/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TICKER_DETAIL),
      })
    );
    await page.route('**/api/v1/observability/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.route('**/api/v1a/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.goto('/');

    // Trigger analysis first
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS, TCS.NS');
    await page.locator('[data-testid="analyze-button"]').click();
    await page.locator('[data-testid="results-table"]').waitFor({ state: 'visible', timeout: 10000 });
  });

  test('drawer is hidden initially', async ({ page }) => {
    const drawer = page.locator('[data-testid="stock-detail-drawer"]');
    await expect(drawer).not.toBeVisible();
  });

  test('clicking a ticker opens the detail drawer', async ({ page }) => {
    // Click on a ticker link in the results table
    await page.locator('[data-testid="ticker-link-RELIANCE.NS"]').click();

    // Drawer should become visible
    const drawer = page.locator('[data-testid="stock-detail-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
  });

  test('drawer displays bullish score and confidence', async ({ page }) => {
    await page.locator('[data-testid="ticker-link-RELIANCE.NS"]').click();

    const drawer = page.locator('[data-testid="stock-detail-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Score should be displayed
    const score = page.locator('[data-testid="detail-score"]');
    await expect(score).toContainText('85');

    // Projected range should be shown
    const range = page.locator('[data-testid="detail-range"]');
    await expect(range).toBeVisible();
  });

  test('drawer shows indicator breakdown table', async ({ page }) => {
    await page.locator('[data-testid="ticker-link-RELIANCE.NS"]').click();

    const drawer = page.locator('[data-testid="stock-detail-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Indicator table should be present
    const indicatorTable = page.locator('[data-testid="indicator-table"]');
    await expect(indicatorTable).toBeVisible();

    // Should show sub-score names
    await expect(indicatorTable).toContainText('RSI');
    await expect(indicatorTable).toContainText('MACD');
  });

  test('drawer displays price chart', async ({ page }) => {
    await page.locator('[data-testid="ticker-link-RELIANCE.NS"]').click();

    const drawer = page.locator('[data-testid="stock-detail-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Chart container should be present
    const chart = page.locator('[data-testid="price-chart"]');
    await expect(chart).toBeVisible();
  });
});
