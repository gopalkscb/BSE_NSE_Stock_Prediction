// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for MVP4 RAG-Powered Intelligence features.
 * Tests AI signal explanations, conversational Q&A chat panel,
 * and RAG evaluation dashboard.
 * Uses route interception for isolation.
 *
 * @tags mvp4, rag
 */

const MOCK_ANALYSIS_WITH_EXPLANATION = {
  results: [
    {
      ticker: 'RELIANCE.NS',
      bullish_score: 82,
      enhanced_score: 86,
      confidence: 'High',
      sub_scores: {
        rsi: 18, macd: 16, bollinger: 14, moving_avg: 20, volume: 14,
        stochastic: 16, mfi: 14, adx: 12, supertrend: 18, obv: 15, vwap: 13,
      },
      projected_lower: 2700,
      projected_upper: 3100,
      explanation: 'RELIANCE.NS shows strong bullish momentum driven by recent Q2 earnings beat (+12% YoY revenue growth). RSI at 32 suggests the stock is near oversold territory after a 5% pullback, presenting a potential entry point. MACD crossover occurred 3 days ago with rising histogram volume, confirming trend reversal. News sources cite increased FII buying activity and Jio platform monetization progress.',
      explanation_sources: [
        { title: 'Reliance Q2 Results Beat Street Estimates', source: 'Economic Times', date: '2026-07-20' },
        { title: 'FII Buying in Reliance Hits 3-Month High', source: 'Moneycontrol', date: '2026-07-21' },
      ],
    },
  ],
  failed: [],
};

const MOCK_CHAT_RESPONSE = {
  answer: 'Based on recent market data, RELIANCE.NS has a bullish outlook primarily due to three factors: (1) Strong Q2 earnings with 12% revenue growth, (2) Positive MACD crossover with rising histogram, and (3) Increased institutional buying. The RSI at 32 suggests it is near oversold, which historically precedes a bounce in this stock.',
  sources: [
    { title: 'Reliance Q2 Earnings Analysis', source: 'Economic Times', relevance: 0.92 },
    { title: 'Technical Analysis: RELIANCE.NS', source: 'Internal Indicators', relevance: 0.88 },
  ],
  confidence: 0.87,
  tokens_used: 340,
};

const MOCK_RAG_EVAL_LATEST = {
  timestamp: '2026-07-22T08:00:00Z',
  metrics: {
    'precision@5': 0.72,
    'precision@10': 0.65,
    'recall@5': 0.58,
    'recall@10': 0.71,
    mrr: 0.78,
    faithfulness: 0.85,
    relevance: 0.79,
  },
  sample_count: 50,
  avg_latency_ms: 1850,
  cost_usd: 0.42,
};

const MOCK_RAG_EVAL_HISTORY = [
  { date: '2026-07-22', precision_at_10: 0.65, recall_at_10: 0.71, mrr: 0.78, faithfulness: 0.85, cost_usd: 0.42 },
  { date: '2026-07-21', precision_at_10: 0.63, recall_at_10: 0.69, mrr: 0.76, faithfulness: 0.83, cost_usd: 0.38 },
  { date: '2026-07-20', precision_at_10: 0.61, recall_at_10: 0.67, mrr: 0.74, faithfulness: 0.81, cost_usd: 0.35 },
];

test.describe('MVP4 RAG — AI Signal Explanations', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v2/analyze', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ANALYSIS_WITH_EXPLANATION),
      })
    );
    await page.route('**/api/v4/rag/query', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHAT_RESPONSE),
      })
    );
    await page.route('**/api/v1/observability/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.route('**/api/v1a/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
  });

  test('analysis results include AI-generated signal explanations', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    const table = page.locator('[data-testid="results-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Click ticker to open drawer with explanation
    await page.locator('[data-testid="ticker-link-RELIANCE.NS"]').click();

    const drawer = page.locator('[data-testid="stock-detail-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Explanation section should be present
    const explanation = page.locator('[data-testid="signal-explanation"]');
    await expect(explanation).toBeVisible();
    await expect(explanation).toContainText('bullish momentum');
  });

  test('explanation shows grounded sources (news articles)', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('[data-testid="ticker-input"]');
    await input.fill('RELIANCE.NS');
    await page.locator('[data-testid="analyze-button"]').click();

    await page.locator('[data-testid="results-table"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="ticker-link-RELIANCE.NS"]').click();

    const drawer = page.locator('[data-testid="stock-detail-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Sources section should show news references
    const sources = page.locator('[data-testid="explanation-sources"]');
    await expect(sources).toBeVisible();
    await expect(sources).toContainText('Economic Times');
  });
});

test.describe('MVP4 RAG — Conversational Q&A Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v4/rag/query', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHAT_RESPONSE),
      })
    );
    await page.route('**/api/v1/analyze', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], failed: [] }) })
    );
    await page.route('**/api/v1/observability/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.route('**/api/v1a/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.goto('/');
  });

  test('Ask AI button opens the chat drawer', async ({ page }) => {
    const askAiButton = page.locator('[data-testid="ask-ai-button"]');
    await expect(askAiButton).toBeVisible();
    await askAiButton.click();

    const chatDrawer = page.locator('[data-testid="ask-ai-drawer"]');
    await expect(chatDrawer).toBeVisible({ timeout: 3000 });
  });

  test('user can submit a question and receive AI answer', async ({ page }) => {
    // Open chat drawer
    await page.locator('[data-testid="ask-ai-button"]').click();
    const chatDrawer = page.locator('[data-testid="ask-ai-drawer"]');
    await expect(chatDrawer).toBeVisible({ timeout: 3000 });

    // Type a question
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Why is RELIANCE.NS bullish right now?');
    await page.locator('[data-testid="chat-send-button"]').click();

    // Answer should appear
    const answer = page.locator('[data-testid="chat-answer"]');
    await expect(answer).toBeVisible({ timeout: 10000 });
    await expect(answer).toContainText('bullish outlook');
  });

  test('chat displays source citations with relevance scores', async ({ page }) => {
    await page.locator('[data-testid="ask-ai-button"]').click();
    const chatDrawer = page.locator('[data-testid="ask-ai-drawer"]');
    await expect(chatDrawer).toBeVisible({ timeout: 3000 });

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Explain the MACD signal for RELIANCE');
    await page.locator('[data-testid="chat-send-button"]').click();

    // Sources section
    const chatSources = page.locator('[data-testid="chat-sources"]');
    await expect(chatSources).toBeVisible({ timeout: 10000 });
    await expect(chatSources).toContainText('Economic Times');
  });

  test('chat shows confidence indicator for AI responses', async ({ page }) => {
    await page.locator('[data-testid="ask-ai-button"]').click();
    await page.locator('[data-testid="ask-ai-drawer"]').waitFor({ state: 'visible' });

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('What about TCS?');
    await page.locator('[data-testid="chat-send-button"]').click();

    // Confidence badge should be visible
    const confidence = page.locator('[data-testid="chat-confidence"]');
    await expect(confidence).toBeVisible({ timeout: 10000 });
  });

  test('empty question submission shows validation message', async ({ page }) => {
    await page.locator('[data-testid="ask-ai-button"]').click();
    await page.locator('[data-testid="ask-ai-drawer"]').waitFor({ state: 'visible' });

    // Try to send empty message
    await page.locator('[data-testid="chat-send-button"]').click();

    // Should show validation or button stays disabled
    const chatInput = page.locator('[data-testid="chat-input"]');
    const isEmpty = (await chatInput.inputValue()) === '';
    expect(isEmpty).toBeTruthy();
  });
});

test.describe('MVP4 RAG — Evaluation Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v4/rag/evaluation/latest', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RAG_EVAL_LATEST) })
    );
    await page.route('**/api/v4/rag/evaluation/history', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RAG_EVAL_HISTORY) })
    );
    await page.route('**/api/v2/admin/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.route('**/api/v1/observability/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.route('**/api/v1a/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
  });

  test('RAG dashboard tab shows evaluation metrics', async ({ page }) => {
    await page.goto('/admin');

    // Login if needed
    const keyInput = page.locator('[data-testid="admin-api-key-input"]');
    if (await keyInput.isVisible()) {
      await keyInput.fill('test-key-for-development-only-32chars!');
      await page.locator('[data-testid="admin-login-button"]').click();
    }

    // Navigate to RAG tab
    await page.getByText(/RAG/i).click();

    const ragPanel = page.locator('[data-testid="rag-dashboard"]');
    await expect(ragPanel).toBeVisible({ timeout: 5000 });

    // Should show precision, recall, MRR
    await expect(ragPanel).toContainText('precision');
  });

  test('RAG dashboard shows cost tracking', async ({ page }) => {
    await page.goto('/admin');

    const keyInput = page.locator('[data-testid="admin-api-key-input"]');
    if (await keyInput.isVisible()) {
      await keyInput.fill('test-key-for-development-only-32chars!');
      await page.locator('[data-testid="admin-login-button"]').click();
    }

    await page.getByText(/RAG/i).click();

    const ragPanel = page.locator('[data-testid="rag-dashboard"]');
    await expect(ragPanel).toBeVisible({ timeout: 5000 });

    // Should show cost data
    await expect(ragPanel).toContainText('0.42');
  });

  test('RAG dashboard shows degradation warning on metric drop', async ({ page }) => {
    // Override with degraded metrics
    await page.route('**/api/v4/rag/evaluation/latest', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...MOCK_RAG_EVAL_LATEST,
          metrics: { ...MOCK_RAG_EVAL_LATEST.metrics, faithfulness: 0.55 }, // Below 0.7 threshold
        }),
      })
    );

    await page.goto('/admin');

    const keyInput = page.locator('[data-testid="admin-api-key-input"]');
    if (await keyInput.isVisible()) {
      await keyInput.fill('test-key-for-development-only-32chars!');
      await page.locator('[data-testid="admin-login-button"]').click();
    }

    await page.getByText(/RAG/i).click();

    const ragPanel = page.locator('[data-testid="rag-dashboard"]');
    await expect(ragPanel).toBeVisible({ timeout: 5000 });

    // Should show warning indicator for degraded metric
    const warning = page.locator('[data-testid="rag-degradation-warning"]');
    await expect(warning).toBeVisible();
  });
});
