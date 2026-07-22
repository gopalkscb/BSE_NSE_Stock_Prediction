// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for DataSourceSelector component (MVP1a-R4).
 * Uses route interception to mock API responses.
 */

const MOCK_ANALYSIS_RESPONSE = {
  results: [
    {
      ticker: 'RELIANCE.NS',
      bullish_score: 82,
      confidence: 'High',
      source: 'yfinance',
      sub_scores: { rsi: 18, macd: 16, bollinger: 14, moving_avg: 20, volume: 14 },
      projected_lower: 2700,
      projected_upper: 3000,
    },
    {
      ticker: 'TCS.NS',
      bullish_score: 71,
      confidence: 'Medium',
      source: 'bse_india',
      sub_scores: { rsi: 14, macd: 12, bollinger: 15, moving_avg: 16, volume: 14 },
      projected_lower: 3700,
      projected_upper: 4100,
    },
  ],
  failed: [],
};

test.describe('DataSourceSelector', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1a/live-prices', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ market_open: true, prices: [], last_updated: '2026-07-22T10:00:00+05:30' }),
      })
    );
    await page.route('**/api/v1/observability/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
  });

  test('renders source selector dropdown', async ({ page }) => {
    await page.route('**/api/v1/analyze', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANALYSIS_RESPONSE) })
    );

    await page.goto('/');
    const selector = page.locator('[data-testid="data-source-selector"]');
    await expect(selector).toBeVisible();
  });

  test('displays all data source options in dropdown', async ({ page }) => {
    await page.goto('/');
    const selector = page.locator('[data-testid="data-source-selector"]');
    await selector.click();

    await expect(page.getByText(/Auto.*priority/i)).toBeVisible();
    await expect(page.getByText('yfinance')).toBeVisible();
    await expect(page.getByText('BSE India')).toBeVisible();
    await expect(page.getByText('NSE India')).toBeVisible();
    await expect(page.getByText('Alpha Vantage')).toBeVisible();
  });

  test('defaults to "Auto (priority chain)" selection', async ({ page }) => {
    await page.goto('/');
    const selector = page.locator('[data-testid="data-source-selector"]');
    await expect(selector).toContainText(/Auto/i);
  });

  test('passes preferred_source to analyze API on submission', async ({ page }) => {
    let capturedBody = null;
    await page.route('**/api/v1/analyze', (route) => {
      capturedBody = route.request().postDataJSON();
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANALYSIS_RESPONSE) });
    });

    await page.goto('/');

    // Select yfinance
    const selector = page.locator('[data-testid="data-source-selector"]');
    await selector.click();
    await page.getByRole('option', { name: 'yfinance' }).click();

    // Submit analysis
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    await page.waitForTimeout(1000);
    expect(capturedBody).toBeTruthy();
    expect(capturedBody.preferred_source).toBe('yfinance');
  });

  test('sends null preferred_source when Auto is selected', async ({ page }) => {
    let capturedBody = null;
    await page.route('**/api/v1/analyze', (route) => {
      capturedBody = route.request().postDataJSON();
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANALYSIS_RESPONSE) });
    });

    await page.goto('/');
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    await page.waitForTimeout(1000);
    expect(capturedBody).toBeTruthy();
    const src = capturedBody.preferred_source;
    expect(src === null || src === undefined || src === 'auto').toBeTruthy();
  });

  test('results table shows source badge per ticker', async ({ page }) => {
    await page.route('**/api/v1/analyze', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANALYSIS_RESPONSE) })
    );

    await page.goto('/');
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS, TCS.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    const table = page.locator('[data-testid="results-table"]');
    await expect(table).toBeVisible();
    await expect(table).toContainText('yfinance');
    await expect(table).toContainText('bse_india');
  });

  test('selector maintains selection after page interaction', async ({ page }) => {
    await page.goto('/');
    const selector = page.locator('[data-testid="data-source-selector"]');
    await selector.click();
    await page.getByRole('option', { name: 'NSE India' }).click();

    // Interact with other elements
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS');
    await input.clear();

    await expect(selector).toContainText('NSE India');
  });
});
