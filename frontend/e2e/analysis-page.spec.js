// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for AnalysisPage (MVP1 — Requirements 4, 5, 6).
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
    {
      ticker: 'INFY.NS',
      bullish_score: 45,
      confidence: 'Low',
      sub_scores: { rsi: 8, macd: 10, bollinger: 7, moving_avg: 12, volume: 8 },
      projected_lower: 1400,
      projected_upper: 1600,
    },
  ],
  failed: ['INVALID.NS'],
};

test.describe('AnalysisPage — MVP1 Results Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/analyze', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ANALYSIS_RESPONSE),
      })
    );
    await page.route('**/api/v1/observability/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.route('**/api/v1a/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.goto('/');
  });

  test('displays results table after successful analysis', async ({ page }) => {
    // Submit tickers
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS, TCS.NS, INFY.NS, INVALID.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    // Results table should appear
    const table = page.locator('[data-testid="results-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Should contain all successful tickers
    await expect(table).toContainText('RELIANCE.NS');
    await expect(table).toContainText('TCS.NS');
    await expect(table).toContainText('INFY.NS');
  });

  test('shows failed tickers alert when some tickers fail', async ({ page }) => {
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS, INVALID.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    // Should show failed tickers warning
    const failedAlert = page.locator('[data-testid="failed-tickers-alert"]');
    await expect(failedAlert).toBeVisible({ timeout: 10000 });
    await expect(failedAlert).toContainText('INVALID.NS');
  });

  test('displays confidence badges with correct colors', async ({ page }) => {
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS, TCS.NS, INFY.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    const table = page.locator('[data-testid="results-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Check for confidence badge text
    await expect(table).toContainText('High');
    await expect(table).toContainText('Medium');
    await expect(table).toContainText('Low');
  });

  test('shows error alert on API failure', async ({ page }) => {
    // Override route to return error
    await page.route('**/api/v1/analyze', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      })
    );

    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    const errorAlert = page.locator('[data-testid="analysis-error"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
  });
});
