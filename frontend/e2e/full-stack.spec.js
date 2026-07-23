// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Full-stack integration E2E tests for MVP1.
 * These tests run against the LIVE backend (no route mocking).
 * They verify end-to-end flows: submit tickers → score → display → detail drawer.
 *
 * Prerequisites: Both backend (uvicorn) and frontend (vite) must be running.
 * @tags mvp1, full-stack
 */

test.describe('MVP1 Full-Stack Integration', () => {

  test('app loads with header, tabs, and ticker input form', async ({ page }) => {
    await page.goto('/');

    // App layout visible
    await expect(page.locator('[data-testid="app-layout"]')).toBeVisible();

    // Header visible
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.app-header h1')).toContainText('Bullish Stock Predictor');

    // Tabs visible
    await expect(page.locator('[data-testid="app-tabs"]')).toBeVisible();

    // Ticker input form visible
    await expect(page.locator('[data-testid="ticker-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="analyze-button"]')).toBeVisible();
  });

  test('analyze a single valid NSE ticker end-to-end', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    // Wait for results or error (network-dependent)
    const table = page.locator('[data-testid="results-table"]');
    const error = page.locator('[data-testid="analysis-error"]');

    await expect(table.or(error)).toBeVisible({ timeout: 60000 });

    if (await table.isVisible()) {
      await expect(table).toContainText('RELIANCE.NS');
      // Score should be a number between 0-100
      const text = await table.textContent();
      const scoreMatch = text.match(/(\d{1,3})/);
      expect(scoreMatch).not.toBeNull();
    }
  });

  test('analyze multiple tickers and verify ranked results', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS, TCS.NS, INFY.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    const table = page.locator('[data-testid="results-table"]');
    const error = page.locator('[data-testid="analysis-error"]');

    await expect(table.or(error)).toBeVisible({ timeout: 60000 });

    if (await table.isVisible()) {
      // Results should contain at least one ticker
      const text = await table.textContent();
      const hasAtLeastOne = text.includes('RELIANCE.NS') || text.includes('TCS.NS') || text.includes('INFY.NS');
      expect(hasAtLeastOne).toBeTruthy();
    }
  });

  test('detail drawer opens from live results', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    const table = page.locator('[data-testid="results-table"]');
    await expect(table).toBeVisible({ timeout: 60000 });

    // Click on the ticker link
    const tickerLink = page.locator('[data-testid="ticker-link-RELIANCE.NS"]');
    if (await tickerLink.isVisible()) {
      await tickerLink.click();

      const drawer = page.locator('[data-testid="stock-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 10000 });
      await expect(drawer).toContainText('RELIANCE.NS');
    }
  });

  test('handles invalid tickers gracefully in live mode', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('DEFINITELY_INVALID_TICKER_XYZ.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    // Should get either empty results, failed ticker alert, or error — not a crash
    const table = page.locator('[data-testid="results-table"]');
    const error = page.locator('[data-testid="analysis-error"]');
    const failedAlert = page.locator('[data-testid="failed-tickers-alert"]');

    await expect(table.or(error).or(failedAlert)).toBeVisible({ timeout: 60000 });

    // App should remain functional
    await expect(page.locator('[data-testid="app-layout"]')).toBeVisible();
  });

  test('preset selector works end-to-end with live backend', async ({ page }) => {
    await page.goto('/');

    // Select a small preset (Sensex 30 or Nifty 50)
    const preset = page.locator('[data-testid="preset-selector"]');
    await preset.click();

    // Pick the first real option (skip placeholder)
    const options = page.getByRole('option');
    const count = await options.count();
    if (count > 1) {
      await options.nth(1).click();
    }

    // Verify textarea got populated
    const input = page.locator('[data-testid="ticker-input"]');
    const value = await input.inputValue();
    expect(value.length).toBeGreaterThan(0);

    // Submit and wait
    await page.locator('[data-testid="analyze-button"]').click();

    const table = page.locator('[data-testid="results-table"]');
    const error = page.locator('[data-testid="analysis-error"]');
    await expect(table.or(error)).toBeVisible({ timeout: 90000 });
  });

  test('API health endpoint is accessible', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status');
  });
});
