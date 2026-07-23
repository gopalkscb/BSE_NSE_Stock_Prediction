# Implementation Plan: Bullish Stock Predictor MVP1

## Overview

Implement the full-stack Bullish Stock Predictor with observability in a 2-hour build scope.
Basic smoke tests only — no property-based tests, no Playwright E2E, no heavy integration suite.
Heavy test infrastructure (hypothesis, Playwright, full integration suite) is deferred to MVP1b (test hardening phase tracked in MVP3 scope).

Testing stack (basic):
- **Python backend**: `pytest` (basic unit tests — 2-3 per module)
- **Frontend**: Manual QA + optional `npx vitest run` smoke tests

> **Lite gate rule**: Each module must have at least 1 passing test OR a manual verification before proceeding.

---

## Completion Status: ~85% (9/9 tasks done, minor wiring gaps remain)

All 9 tasks have working implementation. Remaining gaps are observability wiring (decorator application, ticker health calls, cache metrics, structlog config) — tracked for completion before MVP1a gate.

---

## Tasks

- [x] 1. Project scaffolding + Pydantic models
  - Create package `__init__.py` files: `src/`, `src/api/`, `src/api/routes/`, `src/data/`, `src/features/`, `src/models/`, `tests/`
  - Create `src/api/models.py` with Pydantic v2 models: `AnalyzeRequest`, `AnalyzeResponse`, `ScoredTicker`, `SubScores`, `IndicatorSet`
  - Create `requirements.txt` with all pinned dependencies
  - Create `pyproject.toml` with `asyncio_mode = "auto"`
  - 1 smoke test: `tests/test_models.py` — valid AnalyzeRequest passes, empty tickers fails
  - _Requirements: 8.1–8.6_
  - ⏱️ **15 min**


- [x] 2. Data fetcher module
  - Implement `src/data/fetch_market_data.py`:
    - `fetch_ticker(ticker, period="1y")` — yfinance wrapper with <50 row check
    - `fetch_batch(tickers)` — sequential fetch ⚠️ **(ThreadPool deferred to MVP1b)**
  - 1 smoke test: `tests/test_fetch.py` — mock yfinance, verify FetchResult structure
  - _Requirements: 2.1–2.4_
  - ⏱️ **15 min**


- [x] 3. Indicator calculator
  - Implement `src/features/indicator_calculator.py`:
    - `compute_rsi`, `compute_macd`, `compute_bollinger_bands`, `compute_sma`, `compute_ema`, `compute_volume_trend`, `compute_indicators`
  - 1 smoke test: `tests/test_indicators.py` — synthetic 252-row DataFrame produces finite IndicatorSet
  - _Requirements: 3.1–3.7_
  - ⏱️ **15 min**


- [x] 4. Bullish scorer
  - Implement `src/models/bullish_scorer.py`:
    - `score_rsi`, `score_macd`, `score_bollinger`, `score_moving_average`, `score_volume`
    - `derive_confidence`, `compute_projected_range`, `score_ticker`, `rank_tickers`
  - 1 smoke test: `tests/test_scorer.py` — verify score in [0,100] and returns ALL ranked tickers (not top-10)
  - _Requirements: 4.1–4.8, 5.1–5.2_
  - ⏱️ **15 min**


- [x] 5. FastAPI app + routes + cache
  - Implement `src/api/cache.py` — simple dict with get/put/clear
  - Implement `src/api/routes/analyze.py` — POST /api/v1/analyze
  - Implement `src/api/routes/ticker.py` — GET /api/v1/ticker/{ticker}
  - Implement `src/api/main.py` — app factory with CORS, /health, include routers
  - 2 smoke tests: `tests/test_api.py` — POST analyze (mocked), GET /health returns 200
  - _Requirements: 1.4, 5.1–5.6, 7.4, 7.5, 8.1, 8.8, 9.1_
  - ⏱️ **20 min**


- [x] 6. Observability backend (SQLite store + middleware + routes)
  - `src/observability/store.py` — ✅ Already built (init_db, record_metric, record_error, etc.)
  - Implement `src/observability/middleware.py` — ObservabilityMiddleware (request_count, duration, errors) ✅
  - Implement `src/observability/timing.py` — @timed decorator + TimingContext ⚠️ **Defined but NOT WIRED** (decorator never applied to any function)
  - Implement `src/api/routes/observability.py` — 4 GET endpoints (/metrics, /errors, /ticker-health, /faq) ✅
  - Wire middleware + observability router into main.py; call init_db() on startup ✅
  - `update_ticker_health()` — ⚠️ **Defined but NOT WIRED** (never called from routes)
  - 1 smoke test: `tests/test_observability_middleware.py` — request records a metric ✅
  - _Requirements: 10.1–10.9_
  - ⏱️ **20 min**


- [x] 7. FAQ knowledge base
  - Create `docs/faq.json` — 28+ entries across **5 categories** (originally planned 4; added 1 extra)
  - 1 smoke test: `tests/test_faq.py` — valid JSON, 5 categories, entries have required fields
  - _Requirements: 10.15_
  - ⏱️ **10 min**


- [x] 8. Frontend — full app (AnalysisPage + ObservabilityPage)
  - Scaffold React + Vite + Cloudscape project under `frontend/` ✅
  - Implement `frontend/src/api/stockApi.js` — analyzeStocks(), getTickerDetail() ✅
  - Implement `frontend/src/api/observabilityApi.js` — getMetrics(), getErrors(), getTickerHealth(), getFaq() ✅
  - Implement `frontend/src/components/TickerInputForm.jsx` — input + submit ✅
  - Implement `frontend/src/pages/AnalysisPage.jsx` — table + drawer trigger ✅
  - Implement `frontend/src/components/StockDetailDrawer.jsx` — indicator breakdown + Recharts chart ✅
  - Implement `frontend/src/pages/ObservabilityPage.jsx` — **2-tab layout** (originally planned 3-panel; FAQ moved to separate top-level tab)
  - Implement `frontend/src/components/MetricsPanel.jsx` — metric cards + ticker health table ✅
  - Implement `frontend/src/components/ErrorLogPanel.jsx` — error table + filter + pagination ✅
  - Implement `frontend/src/components/FaqPanel.jsx` — searchable accordion ✅
  - Implement `frontend/src/App.jsx` — **5 top-level tabs** (Analysis, Live Data, RAG Reference, Observability, FAQ & Guide) — originally planned 2 tabs (Analysis / Observability)
  - Configure `vite.config.js` with proxy to backend ✅
  - No unit tests — manual QA verification
  - _Requirements: 1.1–1.3, 1.6, 6.1–6.6, 7.1–7.3, 10.10–10.14_
  - ⏱️ **30 min**


- [x] 9. Integration verification
  - Run `pytest tests/ -v` — all smoke tests GREEN
  - Start backend: `uvicorn src.api.main:app --reload`
  - Start frontend: `cd frontend && npm run dev`
  - Manual QA: submit tickers → see results → open drawer → check observability tab
  - Verify Swagger UI at /docs shows all endpoints
  - ⏱️ **10 min**

---

## Time Budget

| Task | Time |
|---|---|
| 1. Scaffolding + models | 15 min |
| 2. Data fetcher | 15 min |
| 3. Indicator calculator | 15 min |
| 4. Bullish scorer | 15 min |
| 5. FastAPI app + routes | 20 min |
| 6. Observability backend | 20 min |
| 7. FAQ knowledge base | 10 min |
| 8. Frontend (full) | 30 min |
| 9. Integration verification | 10 min |
| **Total** | **~2.5 hours** |

---

## What's Deferred to MVP1b (Test Hardening — tracked in MVP3 scope)

- Property-based tests (hypothesis) — 9 tests for indicators + scorer
- Full unit test suite expansion (~80 → ~120 tests)
- Playwright E2E tests (14 tests across 4 spec files)
- Integration tests (`test_integration_backend.py`)
- Frontend unit tests (Vitest + React Testing Library)
- ThreadPoolExecutor for batch fetching (currently sequential)
- Strict gate enforcement
- Full Swagger annotations with example payloads
- Wiring `@timed` decorator to analyze route and data fetch functions
- Calling `update_ticker_health()` from the analyze pipeline after scoring
- Cache hit/miss metric emission in the ticker detail route
- structlog configuration (listed in requirements.txt but currently uses standard `logging`)

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "3", "4"] },
    { "id": 2, "tasks": ["5", "6", "7"] },
    { "id": 3, "tasks": ["8"] },
    { "id": 4, "tasks": ["9"] }
  ]
}
```
