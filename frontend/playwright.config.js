// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for BSE/NSE Bullish Stock Predictor.
 *
 * Projects are organized by MVP to allow isolated test runs:
 *   npx playwright test --project=mvp1-isolation    # MVP1 mocked tests
 *   npx playwright test --project=mvp1-fullstack    # MVP1 live integration
 *   npx playwright test --project=mvp1a             # MVP1a tests
 *   npx playwright test --project=mvp2              # MVP2 tests
 *   npx playwright test --project=mvp4              # MVP4 tests
 *   npx playwright test                             # All tests (default)
 *
 * WebServer config starts both backend and frontend automatically.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['junit', { outputFile: 'test-results/e2e-results.xml' }]] : []),
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'on-first-retry' : 'off',
    actionTimeout: 10000,
  },

  /* ── Projects — MVP Isolation ─────────────────────────────── */
  projects: [
    // MVP1: Isolation tests (mocked API)
    {
      name: 'mvp1-isolation',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        'ticker-input.spec.js',
        'analysis-page.spec.js',
        'stock-detail-drawer.spec.js',
        'observability.spec.js',
      ],
    },
    // MVP1: Full-stack integration (live backend)
    {
      name: 'mvp1-fullstack',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        'full-stack.spec.js',
        'observability-full-stack.spec.js',
      ],
    },
    // MVP1a: Live polling, data sources, consumption
    {
      name: 'mvp1a',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        'live-price-banner.spec.js',
        'data-source-selector.spec.js',
        'admin-data-sources.spec.js',
        'usage-limits-panel.spec.js',
        'mvp1a-integration.spec.js',
      ],
    },
    // MVP2: Security, weighted scoring, admin dashboard
    {
      name: 'mvp2',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        'mvp2-security.spec.js',
        'mvp2-weighted-scoring.spec.js',
        'mvp2-admin-dashboard.spec.js',
      ],
    },
    // MVP4: RAG chat, signal explanations, eval dashboard
    {
      name: 'mvp4',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        'mvp4-rag-chat.spec.js',
      ],
    },
    // Cross-browser: Firefox (runs all tests)
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: [
        'ticker-input.spec.js',
        'analysis-page.spec.js',
        'full-stack.spec.js',
      ],
    },
  ],

  /* ── Web Servers ──────────────────────────────────────────── */
  webServer: [
    {
      command: 'cd .. && .venv\\Scripts\\activate && uvicorn src.api.main:app --host 127.0.0.1 --port 8000',
      url: 'http://127.0.0.1:8000/docs',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 15000,
    },
  ],
});
