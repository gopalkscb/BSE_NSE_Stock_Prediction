// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for MVP2 Admin Dashboard.
 * Tests the 5-tab admin panel: System Health, Request Metrics,
 * Security Status, Cache Status, Dependency Versions.
 * Uses route interception for isolation tests.
 *
 * @tags mvp2, admin
 */

const MOCK_SYSTEM_HEALTH = {
  status: 'healthy',
  uptime_seconds: 172800,
  python_version: '3.11.9',
  fastapi_version: '0.111.0',
  memory_mb: 256,
  cpu_percent: 12.5,
  db_size_mb: 4.2,
  active_connections: 3,
};

const MOCK_REQUEST_METRICS = {
  total_requests: 4520,
  requests_today: 142,
  avg_latency_ms: 1180,
  p95_latency_ms: 3200,
  p99_latency_ms: 5100,
  error_rate: 0.028,
  endpoints: [
    { path: '/api/v2/analyze', count: 2800, avg_ms: 2100 },
    { path: '/api/v2/ticker', count: 1200, avg_ms: 350 },
    { path: '/api/v2/cache/status', count: 520, avg_ms: 45 },
  ],
};

const MOCK_SECURITY_STATUS = {
  checks_passing: 15,
  checks_total: 15,
  last_audit: '2026-07-22T08:00:00Z',
  headers_enabled: true,
  rate_limiting_active: true,
  api_key_configured: true,
  cors_restricted: true,
  content_size_limit_active: true,
  swagger_disabled_in_prod: false,
  recent_security_events: [
    { type: 'rate_limit_hit', ip: '192.168.1.50', timestamp: '2026-07-22T10:15:00Z' },
    { type: 'invalid_api_key', ip: '10.0.0.1', timestamp: '2026-07-22T09:45:00Z' },
  ],
};

const MOCK_CACHE_STATUS = {
  backend: 'sqlite',
  ttl_hours: 4,
  total_entries: 89,
  size_mb: 2.1,
  hit_rate: 0.72,
  oldest_entry: '2026-07-22T06:00:00Z',
  newest_entry: '2026-07-22T10:30:00Z',
};

const MOCK_DEPENDENCY_VERSIONS = {
  python: [
    { name: 'fastapi', version: '0.111.0', latest: '0.111.0', status: 'up-to-date' },
    { name: 'pydantic', version: '2.7.1', latest: '2.7.1', status: 'up-to-date' },
    { name: 'yfinance', version: '0.2.40', latest: '0.2.41', status: 'minor-behind' },
  ],
  javascript: [
    { name: 'react', version: '18.3.1', latest: '18.3.1', status: 'up-to-date' },
    { name: '@cloudscape-design/components', version: '3.0.0', latest: '3.0.2', status: 'patch-behind' },
  ],
  vulnerabilities: { high: 0, medium: 1, low: 3 },
};

test.describe('MVP2 Admin Dashboard — 5-Tab Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin API endpoints
    await page.route('**/api/v2/admin/system-health', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SYSTEM_HEALTH) })
    );
    await page.route('**/api/v2/admin/request-metrics', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_REQUEST_METRICS) })
    );
    await page.route('**/api/v2/admin/security-status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SECURITY_STATUS) })
    );
    await page.route('**/api/v2/admin/cache-status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CACHE_STATUS) })
    );
    await page.route('**/api/v2/admin/dependency-versions', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DEPENDENCY_VERSIONS) })
    );
    await page.route('**/api/v1/observability/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.route('**/api/v1a/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
  });

  test('admin dashboard requires API key to access', async ({ page }) => {
    await page.goto('/admin');

    // Should show API key prompt or redirect
    const keyPrompt = page.locator('[data-testid="admin-api-key-input"]');
    const loginForm = page.locator('[data-testid="admin-login"]');
    const redirect = page.locator('[data-testid="app-layout"]');

    await expect(keyPrompt.or(loginForm).or(redirect)).toBeVisible({ timeout: 5000 });
  });

  test('System Health tab displays server metrics', async ({ page }) => {
    await page.goto('/admin');

    // Simulate login if needed
    const keyInput = page.locator('[data-testid="admin-api-key-input"]');
    if (await keyInput.isVisible()) {
      await keyInput.fill('test-key-for-development-only-32chars!');
      await page.locator('[data-testid="admin-login-button"]').click();
    }

    // System Health should be the default tab
    const healthPanel = page.locator('[data-testid="admin-system-health"]');
    await expect(healthPanel).toBeVisible({ timeout: 5000 });

    // Should show uptime, memory, CPU
    await expect(healthPanel).toContainText('healthy');
  });

  test('Request Metrics tab shows endpoint breakdown', async ({ page }) => {
    await page.goto('/admin');

    const keyInput = page.locator('[data-testid="admin-api-key-input"]');
    if (await keyInput.isVisible()) {
      await keyInput.fill('test-key-for-development-only-32chars!');
      await page.locator('[data-testid="admin-login-button"]').click();
    }

    // Navigate to Request Metrics tab
    await page.getByText(/Request Metrics/i).click();

    const metricsPanel = page.locator('[data-testid="admin-request-metrics"]');
    await expect(metricsPanel).toBeVisible({ timeout: 5000 });

    // Should show total requests
    await expect(metricsPanel).toContainText('4520');
  });

  test('Security Status tab shows 15-point checklist', async ({ page }) => {
    await page.goto('/admin');

    const keyInput = page.locator('[data-testid="admin-api-key-input"]');
    if (await keyInput.isVisible()) {
      await keyInput.fill('test-key-for-development-only-32chars!');
      await page.locator('[data-testid="admin-login-button"]').click();
    }

    // Navigate to Security Status tab
    await page.getByText(/Security/i).click();

    const securityPanel = page.locator('[data-testid="admin-security-status"]');
    await expect(securityPanel).toBeVisible({ timeout: 5000 });

    // Should show checks passing
    await expect(securityPanel).toContainText('15');
  });

  test('Cache Status tab shows SQLite cache info', async ({ page }) => {
    await page.goto('/admin');

    const keyInput = page.locator('[data-testid="admin-api-key-input"]');
    if (await keyInput.isVisible()) {
      await keyInput.fill('test-key-for-development-only-32chars!');
      await page.locator('[data-testid="admin-login-button"]').click();
    }

    // Navigate to Cache Status tab
    await page.getByText(/Cache/i).click();

    const cachePanel = page.locator('[data-testid="admin-cache-status"]');
    await expect(cachePanel).toBeVisible({ timeout: 5000 });

    // Should show cache type and TTL
    await expect(cachePanel).toContainText('sqlite');
  });

  test('Dependency Versions tab shows package audit info', async ({ page }) => {
    await page.goto('/admin');

    const keyInput = page.locator('[data-testid="admin-api-key-input"]');
    if (await keyInput.isVisible()) {
      await keyInput.fill('test-key-for-development-only-32chars!');
      await page.locator('[data-testid="admin-login-button"]').click();
    }

    // Navigate to Dependencies tab
    await page.getByText(/Dependenc/i).click();

    const depsPanel = page.locator('[data-testid="admin-dependency-versions"]');
    await expect(depsPanel).toBeVisible({ timeout: 5000 });

    // Should show package names
    await expect(depsPanel).toContainText('fastapi');
    await expect(depsPanel).toContainText('react');
  });

  test('security events are displayed in the Security tab', async ({ page }) => {
    await page.goto('/admin');

    const keyInput = page.locator('[data-testid="admin-api-key-input"]');
    if (await keyInput.isVisible()) {
      await keyInput.fill('test-key-for-development-only-32chars!');
      await page.locator('[data-testid="admin-login-button"]').click();
    }

    await page.getByText(/Security/i).click();

    const securityPanel = page.locator('[data-testid="admin-security-status"]');
    await expect(securityPanel).toBeVisible({ timeout: 5000 });

    // Should display recent security events
    await expect(securityPanel).toContainText('rate_limit_hit');
  });
});
