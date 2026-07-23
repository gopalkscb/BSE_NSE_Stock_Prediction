// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for TickerInputForm (MVP1 — Requirement 1).
 * Uses route interception to mock API responses (isolation tests).
 */

test.describe('TickerInputForm — MVP1 Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all API endpoints to isolate frontend behavior
    await page.route('**/api/v1/analyze', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [], failed: [] }),
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

  test('shows validation error on empty submit', async ({ page }) => {
    // Click Analyze without entering any tickers
    await page.locator('[data-testid="analyze-button"]').click();

    // Should show error alert
    const errorAlert = page.locator('[data-testid="input-error"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Enter at least one ticker');
  });

  test('shows validation error for invalid ticker format', async ({ page }) => {
    // Enter an invalid ticker (lowercase, special chars)
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('invalid_ticker!@#');
    await page.locator('[data-testid="analyze-button"]').click();

    const errorAlert = page.locator('[data-testid="input-error"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Invalid ticker');
  });

  test('accepts valid tickers and submits successfully', async ({ page }) => {
    // Enter valid tickers
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS, TCS.NS, INFY.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    // Error should NOT be visible
    const errorAlert = page.locator('[data-testid="input-error"]');
    await expect(errorAlert).not.toBeVisible();
  });

  test('preset selector populates ticker input field', async ({ page }) => {
    // Open preset selector
    const preset = page.locator('[data-testid="preset-selector"]');
    await preset.click();

    // Select any available preset option
    const option = page.getByRole('option').first();
    await option.click();

    // Textarea should now contain tickers
    const input = page.locator('[data-testid="ticker-input"]');
    const value = await input.inputValue();
    expect(value.length).toBeGreaterThan(0);
    expect(value).toContain('.NS');
  });

  test('clear button resets the form', async ({ page }) => {
    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS, TCS.NS');

    // Click clear
    await page.locator('[data-testid="clear-button"]').click();

    // Input should be empty
    const value = await input.inputValue();
    expect(value).toBe('');
  });
});
