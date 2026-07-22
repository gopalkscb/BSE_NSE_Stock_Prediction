# MVP1b — Test Hardening

> Production-grade test coverage: property-based tests, full unit suite, integration, Playwright E2E, concurrent fetching, Swagger annotations

## Status: 📋 Planned

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

| Area | Before (MVP1) | After (MVP1b) |
|---|---|---|
| Python unit tests | ~10 smoke tests | ~80 comprehensive tests |
| Property-based tests | 0 | 9 (hypothesis) |
| Backend integration tests | 0 | 6 (httpx + ASGITransport) |
| Frontend unit tests | 0 | ~20 (Vitest + RTL) |
| Playwright E2E tests | 0 | 6 spec files (~25 tests) |
| **Total tests** | **~10** | **~140** |
| Batch fetching | Sequential | Concurrent (ThreadPoolExecutor, 10 workers) |
| Swagger docs | Basic | Full annotations + examples |

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

| Task | Description | Gate |
|---|---|---|
| T1 | Property-based tests (hypothesis) | `pytest tests/test_properties.py` GREEN |
| T2 | Full Python unit test expansion (~80 tests) | `pytest tests/ -v` GREEN, <30s |
| T3 | Backend integration tests | `pytest tests/test_integration_backend.py` GREEN |
| T4 | Frontend unit tests (Vitest + RTL) | `npx vitest run` GREEN |
| T5 | Playwright E2E tests (6 spec files) | `npx playwright test` GREEN |
| T6 | ThreadPoolExecutor for batch fetching | Concurrent faster than sequential for 5+ tickers |
| T7 | Full Swagger annotations | OpenAPI schema validated by test |
| T8 | **Release gate** | ALL ≥125 tests GREEN in <2 minutes |

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
├── src/**/*.test.jsx              # Component + page unit tests
└── e2e/
    ├── ticker-input.spec.js
    ├── analysis-page.spec.js
    ├── stock-detail-drawer.spec.js
    ├── observability.spec.js
    ├── full-stack.spec.js
    └── observability-full-stack.spec.js
```

---

## Prerequisite Chain

```
MVP1 (smoke tests GREEN) → MVP1b (T1–T7 all GREEN) → MVP3 (mobile development starts)
```

MVP1b does NOT block MVP2. MVP2 can proceed in parallel with MVP1b.

---

[← Back to Journey README](README.md)
