# MVP1b — Test Hardening

> Production-grade test coverage: property-based tests, full unit suite, integration, Playwright E2E, concurrent fetching, Swagger annotations

## Status: 🟡 Partial (T5 Complete — E2E done)

**T5 (Playwright E2E) is complete and exceeds the original spec:** 15 spec files with 119 tests across 6 Playwright projects (original spec called for 6 spec files with ~25 tests). All other tasks (T1–T4, T6–T7) remain incomplete.

## Spec Files
- [Requirements](.kiro/specs/mvp1b-test-hardening/requirements.md)
- [Design](.kiro/specs/mvp1b-test-hardening/design.md)
- [Tasks](.kiro/specs/mvp1b-test-hardening/tasks.md)

---

## Purpose

MVP1b is a focused test-hardening sprint that backfills comprehensive test coverage deferred from MVP1's 2-hour build scope. No new features are added — only tests, concurrency improvements, and API documentation.

**Prerequisite:** MVP1 complete (Tasks 1–15, all smoke tests GREEN).
**Gate:** ALL T1–T7 must be GREEN before starting MVP3 mobile development.

---

## What It Adds

| Area | Before (MVP1) | Target (MVP1b) | Current Actual |
|---|---|---|---|
| Python unit tests | ~27 tests | ~80 comprehensive tests | ~27 (T2 not started) |
| Property-based tests | 0 | 9 (hypothesis) | 0 (T1 not started) |
| Backend integration tests | 0 | 6 (httpx + ASGITransport) | 0 (T3 not started) |
| Frontend unit tests | 0 | ~20 (Vitest + RTL) | 0 (T4 not started) |
| Playwright E2E tests | 0 | 6 spec files (~25 tests) | **15 spec files (119 tests) ✅ EXCEEDS** |
| **Total tests** | **~27** | **~140** | **~146 (27 pytest + 119 E2E)** |
| Batch fetching | Sequential | Concurrent (ThreadPoolExecutor, 10 workers) | Sequential (T6 not started) |
| Swagger docs | Basic | Full annotations + examples | Basic (T7 not started) |

---

## Requirements Summary

| # | Requirement | Summary |
|---|---|---|
| R1 | Property-Based Tests | 9 hypothesis tests: RSI bounds, Bollinger ordering, MACD identity, score bounds, confidence totality, projected range ordering, rank invariants, suffix idempotency |
| R2 | Full Unit Test Suite | Expand from ~10 to ~80 tests; every public function has ≥2 tests (happy path + edge case) |
| R3 | Backend Integration Tests | httpx.AsyncClient + ASGITransport; full pipeline, partial failure, CORS, Swagger validation |
| R4 | Frontend Unit Tests | Vitest + React Testing Library; all components + pages + API client |
| R5 | Playwright E2E Tests | 6 spec files: ticker-input, analysis-page, stock-detail-drawer, observability, full-stack, observability-full-stack |
| R6 | Concurrent Batch Fetching | ThreadPoolExecutor(max_workers=10), 60s hard timeout, timeout tickers marked as failed |
| R7 | Full Swagger Annotations | summary + description + response_description + example bodies on all endpoints |

---

## Tasks (T1–T8)

| Task | Description | Gate | Status |
|---|---|---|---|
| T1 | Property-based tests (hypothesis) | `pytest tests/test_properties.py` GREEN | ❌ Not started |
| T2 | Full Python unit test expansion (~80 tests) | `pytest tests/ -v` GREEN, <30s | ❌ Not started |
| T3 | Backend integration tests | `pytest tests/test_integration_backend.py` GREEN | ❌ Not started |
| T4 | Frontend unit tests (Vitest + RTL) | `npx vitest run` GREEN | ❌ Not started |
| T5 | Playwright E2E tests (6 spec files) | `npx playwright test` GREEN | ✅ **Done (exceeds: 15 files, 119 tests, 6 projects)** |
| T6 | ThreadPoolExecutor for batch fetching | Concurrent faster than sequential for 5+ tickers | ❌ Not started |
| T7 | Full Swagger annotations | OpenAPI schema validated by test | ❌ Not started |
| T8 | **Release gate** | ALL ≥125 tests GREEN in <2 minutes | 🟡 Partial (146 tests exist, but T1–T4 not done) |

---

## Key Commands

```bash
# Run all Python tests (unit + property + integration)
pytest tests/ -v

# Run frontend unit tests
cd frontend && npx vitest run

# Run Playwright E2E (both servers must be running)
cd frontend && npx playwright test

# Run with coverage
pytest tests/ --cov=src --cov-report=term-missing
```

---

## Test Architecture

```
tests/
├── conftest.py                    # Shared fixtures
├── test_models.py                 # Pydantic validation (expanded)
├── test_swagger.py                # OpenAPI completeness
├── test_fetch.py                  # Data fetcher + concurrent tests
├── test_indicators.py             # Indicator calculator (expanded)
├── test_scorer.py                 # Scorer boundary values (expanded)
├── test_cache.py                  # Cache + concurrency
├── test_api.py                    # Route tests (expanded)
├── test_properties.py             # 9 hypothesis property tests
└── test_integration_backend.py    # Full pipeline integration

frontend/
├── src/**/*.test.jsx              # Component + page unit tests (T4 — not started)
└── e2e/                           # ✅ T5 COMPLETE — 15 spec files, 119 tests
    ├── ticker-input.spec.js           # Ticker input form tests
    ├── analysis-page.spec.js          # Analysis results page tests
    ├── stock-detail-drawer.spec.js    # Detail drawer tests
    ├── observability.spec.js          # Observability tab tests
    ├── observability-full-stack.spec.js # Observability live integration
    ├── full-stack.spec.js             # Live backend + frontend integration
    ├── admin-data-sources.spec.js     # MVP1a: admin data source management
    ├── data-source-selector.spec.js   # MVP1a: source selector UI
    ├── live-price-banner.spec.js      # MVP1a: live price display
    ├── mvp1a-integration.spec.js      # MVP1a: full integration
    ├── usage-limits-panel.spec.js     # MVP1a: usage & limits panel
    ├── mvp2-admin-dashboard.spec.js   # MVP2: admin dashboard
    ├── mvp2-security.spec.js          # MVP2: security features
    ├── mvp2-weighted-scoring.spec.js  # MVP2: weighted scoring UI
    └── mvp4-rag-chat.spec.js          # MVP4: RAG chat panel
```

---

## Prerequisite Chain

```
MVP1 (smoke tests GREEN) → MVP1b (T1–T7 all GREEN) → MVP3 (mobile development starts)
```

MVP1b does NOT block MVP2. MVP2 can proceed in parallel with MVP1b.

---

[← Back to Journey README](README.md)
