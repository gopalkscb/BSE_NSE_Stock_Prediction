
# Implementation Plan: MVP1b Test Hardening

## Overview

MVP1b is a focused sprint to backfill production-grade test coverage deferred from MVP1. No new features — only tests, concurrency, and Swagger documentation.

> **Prerequisite**: MVP1 (Tasks 1–15) complete and all smoke tests GREEN.
> **Gate**: ALL tasks below must be GREEN before starting MVP3 mobile development.

---

## Tasks

- [ ] T1. Property-based tests (hypothesis)
  - Create `tests/test_properties.py` with 9 property tests:
    - RSI always in [0, 100] for any positive close series
    - Bollinger upper > middle > lower for any positive close series
    - MACD line = fast_ema - slow_ema at every position
    - bullish_score always in [0, 100], equals sum of sub-scores
    - Each sub-score in [0, 20]
    - derive_confidence is total (maps every 0–100 to exactly one label)
    - projected_lower ≤ last_close ≤ projected_upper
    - ranked result length ≤ 10, non-increasing, from original input
    - apply_exchange_suffix is idempotent
  - 🔴 **Gate**: `pytest tests/test_properties.py` — all GREEN

- [ ] T2. Full Python unit test suite expansion
  - Expand `tests/test_fetch.py` from 3 to ~12 tests (concurrent, timeout, edge cases)
  - Expand `tests/test_indicators.py` from 3 to ~15 tests (all indicator edge cases)
  - Expand `tests/test_scorer.py` from 3 to ~20 tests (all boundary values for all 5 scorers)
  - Expand `tests/test_cache.py` from 3 to ~8 tests (concurrency, overflow, types)
  - Expand `tests/test_api.py` from 3 to ~15 tests (all error paths, validation)
  - Expand `tests/test_models.py` from 2 to ~8 tests (all model edge cases)
  - 🔴 **Gate**: `pytest tests/ -v` — ~80 tests, all GREEN, <30 seconds

- [ ] T3. Backend integration tests
  - Create `tests/test_integration_backend.py` using httpx.AsyncClient + ASGITransport
  - Tests: full pipeline, partial failure, detail endpoint, Swagger UI, OpenAPI validation, CORS
  - 🔴 **Gate**: `pytest tests/test_integration_backend.py` — all GREEN (no network calls)

- [ ] T4. Frontend unit tests (Vitest + React Testing Library)
  - Create `frontend/src/api/stockApi.test.js` (4 tests: payload, response, 404, 200)
  - Create `frontend/src/components/TickerInputForm.test.jsx` (5 tests: render, empty, dedup, >200, disabled)
  - Create `frontend/src/components/StockDetailDrawer.test.jsx` (5 tests: hidden, spinner, rows, 404, chart)
  - Create `frontend/src/pages/AnalysisPage.test.jsx` (5 tests: spinner, error, table, badge, row click)
  - Create tests for all other components (StatCard, SignalDots, etc.)
  - 🔴 **Gate**: `cd frontend && npx vitest run` — all GREEN

- [ ] T5. Playwright E2E tests
  - Create `frontend/e2e/ticker-input.spec.js` (3 tests)
  - Create `frontend/e2e/analysis-page.spec.js` (4 tests)
  - Create `frontend/e2e/stock-detail-drawer.spec.js` (5 tests)
  - Create `frontend/e2e/observability.spec.js` (3 tests)
  - Create `frontend/e2e/full-stack.spec.js` (7 tests, live servers)
  - Create `frontend/e2e/observability-full-stack.spec.js` (3 tests)
  - 🔴 **Gate**: `cd frontend && npx playwright test` — all GREEN

- [ ] T6. ThreadPoolExecutor for batch fetching
  - Upgrade `fetch_batch()` to use `ThreadPoolExecutor(max_workers=10)`
  - Add 60-second hard timeout
  - Mark timed-out tickers as `"timeout"` in failed list
  - Add unit test verifying concurrent is faster than sequential for 5+ tickers
  - 🔴 **Gate**: `pytest tests/test_fetch.py` — all GREEN (including new concurrency tests)

- [ ] T7. Full Swagger annotations
  - Add `summary`, `description`, `response_description` to all endpoints
  - Add example response bodies for 422, 404, 500 error codes
  - Add `json_schema_extra` with examples to request models
  - Write `tests/test_swagger.py` validating OpenAPI schema completeness
  - 🔴 **Gate**: `pytest tests/test_swagger.py` — all GREEN

---

## Final Gate

- [ ] T8. 🔴 MVP1b release gate
  - `pytest tests/ -v` — ALL ~80+ Python tests GREEN
  - `cd frontend && npx vitest run` — ALL ~20 JS tests GREEN
  - `cd frontend && npx playwright test` — ALL ~25 E2E tests GREEN
  - Total test count ≥ 125
  - All tests pass in under 2 minutes total
  - **MVP1b is complete. MVP3 mobile development may now begin.**

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["T1", "T6", "T7"] },
    { "id": 1, "tasks": ["T2", "T3"] },
    { "id": 2, "tasks": ["T4", "T5"] },
    { "id": 3, "tasks": ["T8"] }
  ]
}
```
