
# Design Document — MVP1b Test Hardening

## Overview

MVP1b is a focused test-hardening sprint that upgrades the MVP1 test suite from basic smoke tests to production-grade coverage. No new features are added — only tests, concurrency improvements, and documentation.

---

## Test Architecture

```
tests/
├── conftest.py                    # Shared fixtures (synthetic OHLCV factory, mocks)
├── test_models.py                 # Pydantic model validation (expanded)
├── test_swagger.py                # Swagger/OpenAPI completeness
├── test_fetch.py                  # Data fetcher (expanded + concurrent tests)
├── test_indicators.py             # Indicator calculator (expanded)
├── test_scorer.py                 # Scorer (expanded + all boundary values)
├── test_cache.py                  # Cache (expanded + concurrency)
├── test_api.py                    # Route unit tests (expanded)
├── test_properties.py             # NEW: hypothesis property-based tests (9 tests)
└── test_integration_backend.py    # NEW: full pipeline integration tests

frontend/
├── src/api/stockApi.test.js        # API client unit tests
├── src/pages/AnalysisPage.test.jsx # Page unit tests
├── src/components/*.test.jsx       # Component unit tests (all components)
└── e2e/
    ├── ticker-input.spec.js
    ├── analysis-page.spec.js
    ├── stock-detail-drawer.spec.js
    ├── observability.spec.js
    ├── full-stack.spec.js
    └── observability-full-stack.spec.js
```

---

## Test Coverage Targets

| Layer | Current (MVP1) | Target (MVP1b) | Tool |
|---|---|---|---|
| Python unit tests | ~10 smoke | ~80 comprehensive | pytest |
| Property-based | 0 | 9 | hypothesis |
| Backend integration | 0 | 6 | httpx + ASGITransport |
| Frontend unit | 0 | ~20 (all components) | Vitest + RTL |
| E2E browser | 0 | 6 spec files (~25 tests) | Playwright |
| **Total** | **~10** | **~140** | — |

---

## Concurrency Upgrade (T6)

```python
# Before (MVP1): sequential
def fetch_batch(tickers):
    return [fetch_ticker(t) for t in tickers]

# After (MVP1b): concurrent with timeout
from concurrent.futures import ThreadPoolExecutor, as_completed

def fetch_batch(tickers, timeout=60):
    results = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_ticker, t): t for t in tickers}
        for future in as_completed(futures, timeout=timeout):
            ticker = futures[future]
            try:
                results.append(future.result())
            except TimeoutError:
                results.append(FetchResult(ticker=ticker, status="timeout", df=None, error="Batch timeout"))
    return results
```

---

## Gate Rule

All T1–T7 must be GREEN before starting MVP3 mobile development:
```bash
pytest tests/ -v                    # All Python tests GREEN
cd frontend && npx vitest run       # All JS tests GREEN
cd frontend && npx playwright test  # All E2E tests GREEN
```
