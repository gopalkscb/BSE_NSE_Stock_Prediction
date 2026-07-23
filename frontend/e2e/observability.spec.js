// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for ObservabilityPage (MVP1 — Requirement 10).
 * Uses route interception to mock observability API responses.
 */

const MOCK_METRICS = {
  total_requests: 142,
  avg_latency_ms: 1250,
  cache_hit_rate: 0.65,
  error_rate: 0.03,
  uptime_seconds: 86400,
  active_sessions: 3,
};

const MOCK_ERRORS = {
  errors: [
    { id: 1, level: 'ERROR', message: 'yfinance timeout for INVALID.NS', timestamp: '2026-07-22T10:15:00Z', source: 'data_fetcher' },
    { id: 2, level: 'WARNING', message: 'Low data quality for 500325.BO', timestamp: '2026-07-22T10:10:00Z', source: 'indicator_calculator' },
    { id: 3, level: 'ERROR', message: 'Connection reset during batch fetch', timestamp: '2026-07-22T09:45:00Z', source: 'data_fetcher' },
  ],
  total: 3,
};

const MOCK_TICKER_HEALTH = {
  tickers: [
    { ticker: 'RELIANCE.NS', status: 'healthy', last_fetch: '2026-07-22T10:30:00Z', data_points: 252 },
    { ticker: 'TCS.NS', status: 'healthy', last_fetch: '2026-07-22T10:30:00Z', data_points: 252 },
    { ticker: 'INVALID.NS', status: 'error', last_fetch: '2026-07-22T10:15:00Z', data_points: 0 },
  ],
};

const MOCK_FAQ = {
  categories: [
    {
      name: 'Getting Started',
      entries: [
        { id: 'gs-1', question: 'How do I analyze stocks?', answer: 'Enter ticker symbols and click Analyze.' },
      ],
    },
    {
      name: 'Indicators',
      entries: [
        { id: 'ind-1', question: 'What is RSI?', answer: 'RSI measures momentum on a 0-100 scale.' },
      ],
    },
  ],
};

test.describe('ObservabilityPage — MVP1 Observability Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/observability/metrics', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_METRICS) })
    );
    await page.route('**/api/v1/observability/errors', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ERRORS) })
    );
    await page.route('**/api/v1/observability/ticker-health', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TICKER_HEALTH) })
    );
    await page.route('**/api/v1/observability/faq', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_FAQ) })
    );
    await page.route('**/api/v1/analyze', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], failed: [] }) })
    );
    await page.route('**/api/v1a/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.goto('/');

    // Navigate to Observability tab
    await page.locator('[data-testid="app-tabs"]').getByText(/Observability/i).click();
  });

  test('displays metrics panel with live metrics cards', async ({ page }) => {
    // Metrics panel should show request count
    const totalRequests = page.locator('[data-testid="metric-total-requests"]');
    await expect(totalRequests).toBeVisible({ timeout: 5000 });
    await expect(totalRequests).toContainText('142');

    // Average latency
    const avgLatency = page.locator('[data-testid="metric-avg-latency"]');
    await expect(avgLatency).toBeVisible();
    await expect(avgLatency).toContainText('1250');
  });

  test('displays error log panel with filterable entries', async ({ page }) => {
    // Navigate to error log sub-tab if needed
    const errorLogTable = page.locator('[data-testid="error-log-table"]');

    // Check if errors tab exists and click it
    const errorsTab = page.getByText(/Error/i);
    if (await errorsTab.isVisible()) {
      await errorsTab.click();
    }

    await expect(errorLogTable).toBeVisible({ timeout: 5000 });

    // Should display error entries
    await expect(errorLogTable).toContainText('yfinance timeout');
    await expect(errorLogTable).toContainText('ERROR');
  });

  test('FAQ tab renders searchable accordion', async ({ page }) => {
    // Switch to FAQ tab from app-level tabs
    await page.locator('[data-testid="app-tabs"]').getByText(/FAQ/i).click();

    // Search box should be present
    const searchBox = page.locator('[data-testid="faq-search"]');
    await expect(searchBox).toBeVisible({ timeout: 5000 });

    // FAQ entries should be present
    const entry = page.locator('[data-testid="faq-entry-gs-1"]');
    await expect(entry).toBeVisible();
  });
});
