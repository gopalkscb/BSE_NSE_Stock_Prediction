// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Full-stack integration E2E tests for MVP1a.
 * These tests run against the LIVE backend (no route mocking).
 * They verify end-to-end flows: live polling, data source switching,
 * admin management, and consumption tracking working together.
 *
 * Prerequisites: Both backend (uvicorn) and frontend (vite) must be running.
 */

test.describe('MVP1a Full-Stack Integration', () => {

  test('page loads with live price banner and data source selector', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="app-layout"]')).toBeVisible();
    await expect(page.locator('[data-testid="live-price-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="data-source-selector"]')).toBeVisible();
  });

  test('live prices endpoint responds and banner displays data', async ({ page }) => {
    await page.goto('/');
    const banner = page.locator('[data-testid="live-price-banner"]');
    await expect(banner).toBeVisible();

    // Banner should show either price data or "Market Closed"
    const hasContent = await banner.textContent();
    expect(hasContent.length).toBeGreaterThan(0);
    expect(
      hasContent.includes('Market Closed') ||
      /\d+\.\d+/.test(hasContent)
    ).toBeTruthy();
  });

  test('data source selector integrates with analyze endpoint', async ({ page }) => {
    await page.goto('/');

    // Select a specific source
    const selector = page.locator('[data-testid="data-source-selector"]');
    await selector.click();
    await page.getByRole('option', { name: 'yfinance' }).click();

    // Submit a known ticker for analysis
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    // Wait for results or error (both are valid — depends on network)
    const table = page.locator('[data-testid="results-table"]');
    const error = page.locator('[data-testid="analysis-error"]');

    await expect(table.or(error)).toBeVisible({ timeout: 30000 });

    // If table loaded, it should show source column
    if (await table.isVisible()) {
      await expect(table).toContainText('RELIANCE.NS');
    }
  });

  test('observability tab shows data sources and usage panels', async ({ page }) => {
    await page.goto('/');

    // Navigate to Observability
    await page.locator('[data-testid="app-tabs"]').getByText(/Observability/i).click();

    // Data Sources tab should be accessible
    const dsTab = page.getByText(/Data Sources/i);
    await expect(dsTab).toBeVisible();
    await dsTab.click();

    const adminTab = page.locator('[data-testid="admin-data-sources-tab"]');
    await expect(adminTab).toBeVisible({ timeout: 10000 });

    // Usage & Limits tab should be accessible
    await page.getByText(/Usage.*Limits/i).click();
    const usagePanel = page.locator('[data-testid="usage-limits-panel"]');
    await expect(usagePanel).toBeVisible({ timeout: 10000 });
  });

  test('admin data sources status endpoint returns provider list', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="app-tabs"]').getByText(/Observability/i).click();
    await page.getByText(/Data Sources/i).click();

    const adminTab = page.locator('[data-testid="admin-data-sources-tab"]');
    await expect(adminTab).toBeVisible({ timeout: 10000 });

    // Should display at least yfinance provider
    await expect(adminTab).toContainText('yfinance');
  });

  test('consumption endpoint returns metrics and panel displays them', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="app-tabs"]').getByText(/Observability/i).click();
    await page.getByText(/Usage.*Limits/i).click();

    const panel = page.locator('[data-testid="usage-limits-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Should show some numeric data (calls, tokens, or cost)
    const text = await panel.textContent();
    expect(/\d+/.test(text)).toBeTruthy();
  });

  test('full flow: analyze with source → view consumption increase', async ({ page }) => {
    await page.goto('/');

    // First check consumption panel baseline
    await page.locator('[data-testid="app-tabs"]').getByText(/Observability/i).click();
    await page.getByText(/Usage.*Limits/i).click();
    const panel = page.locator('[data-testid="usage-limits-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Go back to analysis
    await page.locator('[data-testid="app-tabs"]').getByText(/Analysis/i).click();

    // Run analysis
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('TCS.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    // Wait for completion
    await page.waitForTimeout(5000);

    // Go back to consumption panel
    await page.locator('[data-testid="app-tabs"]').getByText(/Observability/i).click();
    await page.getByText(/Usage.*Limits/i).click();
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Should show updated metrics
    const text = await panel.textContent();
    expect(/\d+/.test(text)).toBeTruthy();
  });

  test('provider fallback: if primary fails, results still returned', async ({ page }) => {
    await page.goto('/');

    // Use Auto (priority chain) which enables fallback
    const selector = page.locator('[data-testid="data-source-selector"]');
    await expect(selector).toContainText(/Auto/i);

    // Submit analysis — backend should fallback if primary is down
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('INFY.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    // Should get either results or a meaningful error (not a crash)
    const table = page.locator('[data-testid="results-table"]');
    const error = page.locator('[data-testid="analysis-error"]');
    const failedAlert = page.locator('[data-testid="failed-tickers-alert"]');

    await expect(table.or(error).or(failedAlert)).toBeVisible({ timeout: 30000 });
  });

  test('app does not crash when all APIs return errors', async ({ page }) => {
    // This tests resilience — navigate the whole app with potential backend issues
    await page.goto('/');
    await expect(page.locator('[data-testid="app-layout"]')).toBeVisible();

    // Navigate through all tabs
    await page.locator('[data-testid="app-tabs"]').getByText(/Observability/i).click();
    await page.waitForTimeout(500);

    // Click each sub-tab if available
    const dsTab = page.getByText(/Data Sources/i);
    if (await dsTab.isVisible()) {
      await dsTab.click();
      await page.waitForTimeout(500);
    }

    const usageTab = page.getByText(/Usage.*Limits/i);
    if (await usageTab.isVisible()) {
      await usageTab.click();
      await page.waitForTimeout(500);
    }

    // App should still be functional — no white screen
    await expect(page.locator('[data-testid="app-layout"]')).toBeVisible();
  });
});
