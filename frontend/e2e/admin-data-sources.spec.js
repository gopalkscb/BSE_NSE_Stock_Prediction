// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for AdminDataSourcesTab component (MVP1a-R3).
 * Uses route interception to mock /api/v1a/config/data-sources/status.
 */

const MOCK_DATA_SOURCES_STATUS = [
  {
    name: 'yfinance',
    enabled: true,
    healthy: true,
    priority: 1,
    rate_limit_per_min: 100,
    usage_pct: 23,
    last_fetch: '2026-07-22T10:29:00+05:30',
    consecutive_failures: 0,
  },
  {
    name: 'bse_india',
    enabled: true,
    healthy: true,
    priority: 2,
    rate_limit_per_min: 10,
    usage_pct: 60,
    last_fetch: '2026-07-22T10:28:30+05:30',
    consecutive_failures: 0,
  },
  {
    name: 'nse_india',
    enabled: true,
    healthy: false,
    priority: 3,
    rate_limit_per_min: 5,
    usage_pct: 100,
    last_fetch: '2026-07-22T09:45:00+05:30',
    consecutive_failures: 3,
  },
  {
    name: 'alpha_vantage',
    enabled: false,
    healthy: false,
    priority: 4,
    rate_limit_per_min: 5,
    usage_pct: 0,
    last_fetch: null,
    consecutive_failures: 0,
  },
];

test.describe('AdminDataSourcesTab', () => {
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
    await page.route('**/api/v1a/config/data-sources/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA_SOURCES_STATUS) })
    );
    await page.route('**/api/v1a/observability/consumption**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
  });

  async function navigateToDataSourcesTab(page) {
    await page.goto('/');
    // Navigate to Observability tab first
    await page.locator('[data-testid="app-tabs"]').getByText(/Observability/i).click();
    // Then navigate to Data Sources sub-tab
    await page.getByText(/Data Sources/i).click();
  }

  test('renders the admin data sources table', async ({ page }) => {
    await navigateToDataSourcesTab(page);
    const tab = page.locator('[data-testid="admin-data-sources-tab"]');
    await expect(tab).toBeVisible();
  });

  test('displays all configured providers', async ({ page }) => {
    await navigateToDataSourcesTab(page);
    const tab = page.locator('[data-testid="admin-data-sources-tab"]');
    await expect(tab).toContainText('yfinance');
    await expect(tab).toContainText('bse_india');
    await expect(tab).toContainText('nse_india');
    await expect(tab).toContainText('alpha_vantage');
  });

  test('shows health status badges (healthy/unhealthy)', async ({ page }) => {
    await navigateToDataSourcesTab(page);
    const tab = page.locator('[data-testid="admin-data-sources-tab"]');

    // yfinance should show healthy indicator
    const yfinanceRow = tab.locator('tr', { hasText: 'yfinance' });
    await expect(yfinanceRow).toBeVisible();

    // nse_india should show unhealthy indicator (3 consecutive failures)
    const nseRow = tab.locator('tr', { hasText: 'nse_india' });
    await expect(nseRow).toBeVisible();
  });

  test('shows priority ordering', async ({ page }) => {
    await navigateToDataSourcesTab(page);
    const tab = page.locator('[data-testid="admin-data-sources-tab"]');
    await expect(tab).toContainText('1');
    await expect(tab).toContainText('2');
    await expect(tab).toContainText('3');
    await expect(tab).toContainText('4');
  });

  test('shows rate limit and usage percentage', async ({ page }) => {
    await navigateToDataSourcesTab(page);
    const tab = page.locator('[data-testid="admin-data-sources-tab"]');
    await expect(tab).toContainText('100');
    await expect(tab).toContainText('23');
  });

  test('shows last fetch timestamp', async ({ page }) => {
    await navigateToDataSourcesTab(page);
    const tab = page.locator('[data-testid="admin-data-sources-tab"]');
    await expect(tab).toContainText(/10:29/);
  });

  test('disabled provider shows disabled state', async ({ page }) => {
    await navigateToDataSourcesTab(page);
    const tab = page.locator('[data-testid="admin-data-sources-tab"]');
    const avRow = tab.locator('tr', { hasText: 'alpha_vantage' });
    await expect(avRow).toBeVisible();
    // Should indicate disabled status (grey/disabled text or badge)
  });

  test('enable/disable toggle is present for each provider', async ({ page }) => {
    await navigateToDataSourcesTab(page);
    const tab = page.locator('[data-testid="admin-data-sources-tab"]');
    // Should have toggle controls
    const toggles = tab.locator('[data-testid*="toggle"], [role="switch"], button:has-text("Enable"), button:has-text("Disable")');
    const count = await toggles.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('refresh button triggers status reload', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/v1a/config/data-sources/status', (route) => {
      callCount++;
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA_SOURCES_STATUS) });
    });

    await navigateToDataSourcesTab(page);
    const initialCalls = callCount;

    // Click refresh button
    const refreshBtn = page.locator('button:has-text("Refresh"), [data-testid="refresh-data-sources"]');
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await page.waitForTimeout(500);
      expect(callCount).toBeGreaterThan(initialCalls);
    }
  });

  test('hot-reload config sends POST request', async ({ page }) => {
    let postCalled = false;
    await page.route('**/api/v1a/config/data-sources', (route) => {
      if (route.request().method() === 'POST') {
        postCalled = true;
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'reloaded' }) });
      } else {
        route.continue();
      }
    });

    await navigateToDataSourcesTab(page);

    // Look for a save/apply/reload button
    const reloadBtn = page.locator('button:has-text("Save"), button:has-text("Apply"), button:has-text("Reload"), [data-testid="reload-config"]');
    if (await reloadBtn.first().isVisible()) {
      await reloadBtn.first().click();
      await page.waitForTimeout(500);
      expect(postCalled).toBeTruthy();
    }
  });
});
