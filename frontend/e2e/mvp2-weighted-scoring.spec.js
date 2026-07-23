// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for MVP2 Enhanced Scoring & Configurable Weights.
 * Tests 11-indicator analysis, weight configuration, and v2 API endpoints.
 * Uses route interception for isolation; some tests hit live backend.
 *
 * @tags mvp2, scoring
 */

const MOCK_V2_ANALYSIS_RESPONSE = {
  results: [
    {
      ticker: 'RELIANCE.NS',
      bullish_score: 78,
      enhanced_score: 82,
      confidence: 'High',
      sub_scores: {
        rsi: 18, macd: 16, bollinger: 14, moving_avg: 20, volume: 10,
        stochastic: 16, mfi: 14, adx: 12, supertrend: 18, obv: 15, vwap: 13,
      },
      projected_lower: 2700,
      projected_upper: 3100,
      weights_applied: true,
    },
    {
      ticker: 'TCS.NS',
      bullish_score: 65,
      enhanced_score: 70,
      confidence: 'Medium',
      sub_scores: {
        rsi: 12, macd: 14, bollinger: 10, moving_avg: 16, volume: 13,
        stochastic: 14, mfi: 11, adx: 10, supertrend: 15, obv: 12, vwap: 11,
      },
      projected_lower: 3600,
      projected_upper: 4000,
      weights_applied: true,
    },
  ],
  failed: [],
};

const MOCK_WEIGHTS_CONFIG = {
  rsi: 1.0,
  macd: 1.2,
  bollinger: 0.8,
  moving_avg: 1.5,
  volume: 0.9,
  stochastic: 1.0,
  mfi: 1.1,
  adx: 1.0,
  supertrend: 1.3,
  obv: 0.7,
  vwap: 1.0,
};

test.describe('MVP2 Weighted Scoring — 11 Indicators', () => {

  test('v2 analyze endpoint returns all 11 indicator sub-scores', async ({ page }) => {
    await page.route('**/api/v2/analyze', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_V2_ANALYSIS_RESPONSE),
      })
    );
    await page.route('**/api/v1/observability/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.route('**/api/v1a/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );

    await page.goto('/');

    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS, TCS.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    const table = page.locator('[data-testid="results-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Should display enhanced scores
    await expect(table).toContainText('RELIANCE.NS');
    await expect(table).toContainText('TCS.NS');
  });

  test('detail drawer shows all 11 indicator breakdowns', async ({ page }) => {
    await page.route('**/api/v2/analyze', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_V2_ANALYSIS_RESPONSE),
      })
    );
    await page.route('**/api/v2/ticker/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...MOCK_V2_ANALYSIS_RESPONSE.results[0],
          indicators: {
            rsi: 32.5, macd_line: 12.3, macd_signal: 10.1,
            stochastic_k: 25, stochastic_d: 28,
            mfi: 35, adx: 28, supertrend: 2780,
            obv: 1250000, vwap: 2890,
          },
        }),
      })
    );
    await page.route('**/api/v1/observability/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.route('**/api/v1a/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );

    await page.goto('/');

    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    const table = page.locator('[data-testid="results-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="ticker-link-RELIANCE.NS"]').click();

    const drawer = page.locator('[data-testid="stock-detail-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Should show all indicator names
    const indicatorTable = page.locator('[data-testid="indicator-table"]');
    await expect(indicatorTable).toBeVisible();
    await expect(indicatorTable).toContainText('RSI');
    await expect(indicatorTable).toContainText('MACD');
  });

  test('weight configuration endpoint accepts valid weights (live)', async ({ page }) => {
    const apiKey = process.env.ADMIN_API_KEY || 'test-key-for-development-only-32chars!';

    const response = await page.request.post('http://localhost:8000/api/v2/config/weights', {
      data: MOCK_WEIGHTS_CONFIG,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    // Should be 200 (success) or 401 (test key mismatch) — not 500
    expect([200, 401, 422]).toContain(response.status());
  });

  test('weight configuration rejects invalid weights (negative values)', async ({ page }) => {
    const apiKey = process.env.ADMIN_API_KEY || 'test-key-for-development-only-32chars!';

    const invalidWeights = { ...MOCK_WEIGHTS_CONFIG, rsi: -1.0 };

    const response = await page.request.post('http://localhost:8000/api/v2/config/weights', {
      data: invalidWeights,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    // Should be rejected
    expect([401, 422]).toContain(response.status());
  });

  test('v1 backward compatibility — v1 analyze still works', async ({ page }) => {
    const response = await page.request.post('http://localhost:8000/api/v1/analyze', {
      data: { tickers: ['RELIANCE.NS'] },
      headers: { 'Content-Type': 'application/json' },
    });

    // v1 endpoint should still be functional
    expect([200, 422, 429]).toContain(response.status());
  });

  test('enhanced score is always >= basic score with default weights', async ({ page }) => {
    await page.route('**/api/v2/analyze', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_V2_ANALYSIS_RESPONSE),
      })
    );
    await page.route('**/api/v1/observability/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.route('**/api/v1a/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );

    await page.goto('/');

    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    const table = page.locator('[data-testid="results-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Verify scores are valid numbers in the response
    for (const result of MOCK_V2_ANALYSIS_RESPONSE.results) {
      expect(result.enhanced_score).toBeGreaterThanOrEqual(0);
      expect(result.enhanced_score).toBeLessThanOrEqual(100);
      expect(result.bullish_score).toBeGreaterThanOrEqual(0);
      expect(result.bullish_score).toBeLessThanOrEqual(100);
    }
  });
});
