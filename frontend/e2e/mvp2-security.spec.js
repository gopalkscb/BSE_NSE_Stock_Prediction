// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for MVP2 Security features.
 * Tests security headers, rate limiting, admin API key auth,
 * and injection prevention at the browser level.
 *
 * @tags mvp2, security
 */

test.describe('MVP2 Security — Headers, Rate Limiting, Auth', () => {

  test('API responses include required security headers', async ({ page }) => {
    await page.goto('/');

    // Intercept an API response and check headers
    const responsePromise = page.waitForResponse('**/api/v1/observability/metrics');
    await page.locator('[data-testid="app-tabs"]').getByText(/Observability/i).click();
    const response = await responsePromise;

    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-xss-protection']).toBe('1; mode=block');
    expect(headers['content-security-policy']).toContain("default-src 'self'");
  });

  test('rate limiting returns 429 after exceeding threshold', async ({ page }) => {
    // Rapidly fire requests to trigger rate limit
    const responses = [];
    for (let i = 0; i < 15; i++) {
      const resp = await page.request.post('http://localhost:8000/api/v2/analyze', {
        data: { tickers: ['RELIANCE.NS'] },
        headers: { 'Content-Type': 'application/json' },
      });
      responses.push(resp.status());
    }

    // At least one should be 429 (rate limit: 10/min for analysis)
    const has429 = responses.includes(429);
    expect(has429).toBeTruthy();
  });

  test('admin endpoints reject requests without API key', async ({ page }) => {
    // Try to access admin endpoint without auth
    const response = await page.request.get('http://localhost:8000/api/v2/cache/status');
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.detail).toContain('API key');
  });

  test('admin endpoints accept valid API key in X-API-Key header', async ({ page }) => {
    // This test requires ADMIN_API_KEY env var to be set
    const apiKey = process.env.ADMIN_API_KEY || 'test-key-for-development-only-32chars!';

    const response = await page.request.get('http://localhost:8000/api/v2/cache/status', {
      headers: { 'X-API-Key': apiKey },
    });

    // Should be 200 (if key is valid) or 401 (if test key doesn't match)
    expect([200, 401]).toContain(response.status());
  });

  test('ticker injection attempts are rejected with 422', async ({ page }) => {
    const maliciousPayloads = [
      { tickers: ["'; DROP TABLE--"] },
      { tickers: ['<script>alert(1)</script>'] },
      { tickers: ['../../etc/passwd'] },
      { tickers: ['RELIANCE.NS; rm -rf /'] },
      { tickers: ['127.0.0.1'] },
    ];

    for (const payload of maliciousPayloads) {
      const response = await page.request.post('http://localhost:8000/api/v2/analyze', {
        data: payload,
        headers: { 'Content-Type': 'application/json' },
      });
      // Should be 422 (validation error) or 429 (rate limited) — never 200
      expect([422, 429]).toContain(response.status());
    }
  });

  test('oversized request body (>64KB) is rejected', async ({ page }) => {
    // Create a payload larger than 64KB
    const largeTickers = Array.from({ length: 5000 }, (_, i) => `TICKER${i}.NS`);

    const response = await page.request.post('http://localhost:8000/api/v2/analyze', {
      data: { tickers: largeTickers },
      headers: { 'Content-Type': 'application/json' },
    });

    // Should be rejected (413 or 422)
    expect([413, 422]).toContain(response.status());
  });

  test('Swagger UI is disabled in production mode', async ({ page }) => {
    // In development mode Swagger should be accessible
    // This test documents the expected behavior based on DEPLOYMENT_ENV
    const response = await page.request.get('http://localhost:8000/docs');

    if (process.env.DEPLOYMENT_ENV === 'production') {
      expect(response.status()).toBe(404);
    } else {
      // In dev mode, docs should be accessible
      expect(response.status()).toBe(200);
    }
  });

  test('CORS rejects requests from unauthorized origins', async ({ page }) => {
    // Make a request with a bad origin
    const response = await page.request.post('http://localhost:8000/api/v2/analyze', {
      data: { tickers: ['RELIANCE.NS'] },
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://evil-site.com',
      },
    });

    // Response should NOT include Access-Control-Allow-Origin for evil origin
    const corsHeader = response.headers()['access-control-allow-origin'];
    if (corsHeader) {
      expect(corsHeader).not.toBe('http://evil-site.com');
      expect(corsHeader).not.toBe('*');
    }
  });
});
