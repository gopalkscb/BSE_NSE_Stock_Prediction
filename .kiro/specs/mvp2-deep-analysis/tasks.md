# Implementation Plan: MVP2 Deep-Dive Algorithmic Analysis Engine

## Overview

Tasks 16–35 implement the MVP2 layer on top of the completed MVP1 foundation. All MVP1 tests must remain GREEN throughout. The same gate-rule discipline applies: unit tests must PASS before proceeding.

> **Prerequisite**: All MVP1 tasks (1–15) must be complete and all test suites GREEN before starting MVP2 tasks.

---

## Tasks

- [ ] 16. Extended indicator calculator (6 new indicators)
  - Implement `src/features/indicator_calculator_v2.py` with: `compute_stochastic`, `compute_mfi`, `compute_adx_dmi`, `compute_supertrend`, `compute_obv`, `compute_vwap`, `compute_enhanced_indicators`
  - Add `pandas-ta==0.3.14b` to `requirements.txt` with hash
  - Write `tests/test_indicators_v2.py` with unit + property tests for all 6 new functions
  - 🔴 **Unit gate**: `pytest tests/test_indicators_v2.py` — all GREEN
  - _Requirements: MVP2-R1_

- [ ] 17. Enhanced bullish scorer (weighted scoring)
  - Implement `src/models/bullish_scorer_v2.py` with: `score_stochastic`, `score_mfi`, `score_adx`, `score_supertrend`, `score_obv`, `score_vwap`, `compute_enhanced_score`
  - Create `config/indicator_weights.yaml` with all 11 weights defaulting to 1.0
  - Write `tests/test_scorer_v2.py` with unit + property tests
  - 🔴 **Unit gate**: `pytest tests/test_scorer_v2.py` — all GREEN
  - _Requirements: MVP2-R1, MVP2-R2_

- [ ] 18. Configurable weights API endpoint
  - Implement `POST /api/v2/config/weights` with API key auth
  - Implement `src/api/auth.py` with `verify_api_key` dependency
  - Write `tests/test_weights_api.py`
  - 🔴 **Unit gate**: `pytest tests/test_weights_api.py` — all GREEN
  - _Requirements: MVP2-R2_

- [ ] 19. SQLite persistent cache
  - Implement `src/api/cache_sqlite.py` (replace in-memory dict with aiosqlite, 4hr TTL)
  - Add `aiosqlite==0.20.0` to requirements.txt
  - Implement `GET /api/v2/cache/status` (API key required)
  - Write `tests/test_cache_sqlite.py`
  - 🔴 **Unit gate**: `pytest tests/test_cache_sqlite.py` — all GREEN
  - _Requirements: MVP2-R8_

- [ ] 20. Rate limiting and content size middleware
  - Add `slowapi==0.1.9` to requirements.txt
  - Implement rate limiting: 10 req/min analysis, 2 req/min backtest
  - Implement ContentSizeLimitMiddleware (64KB cap)
  - Write `tests/test_rate_limiting.py`
  - 🔴 **Unit gate**: `pytest tests/test_rate_limiting.py` — all GREEN
  - _Requirements: MVP2-R9_

- [ ] 21. Security headers and API key authentication
  - Implement `src/api/middleware/security.py`: SecurityHeadersMiddleware
  - Implement API key validation with hmac.compare_digest
  - ADMIN_API_KEY from env var, reject <32 chars at startup
  - Write `tests/test_security.py` covering A01–A10 guardrails
  - 🔴 **Unit gate**: `pytest tests/test_security.py` — all GREEN
  - _Requirements: MVP2-R10_

- [ ] 22. Ticker input hardening (injection prevention)
  - Update ticker validation to strict regex: `^[A-Z0-9]{1,10}(\.(NS|BO))?$`
  - Add tests for SQL injection, shell metacharacters, XSS payloads, IP addresses
  - 🔴 **Unit gate**: existing `tests/test_security.py` updated — all GREEN
  - _Requirements: MVP2-R10 (A03), MVP2-R11 (LLM01)_

- [ ] 23. Observability: structlog + Prometheus metrics
  - Add `structlog==24.1.0`, `prometheus-fastapi-instrumentator==6.1.0` to requirements.txt
  - Implement RequestLoggingMiddleware with structlog
  - Implement `src/observability/metrics.py`: setup custom metrics
  - Implement `GET /metrics` (API key required)
  - Write `tests/test_observability.py`
  - 🔴 **Unit gate**: `pytest tests/test_observability.py` — all GREEN
  - _Requirements: MVP2-R12_

- [ ] 24. Health endpoints and security events
  - Implement `GET /health` (public, always 200)
  - Implement `GET /health/ready` (public, 200 or 503)
  - Implement security events ring buffer + `GET /api/v2/security/events`
  - Write `tests/test_health.py`
  - 🔴 **Unit gate**: `pytest tests/test_health.py` — all GREEN
  - _Requirements: MVP2-R12_

- [ ] 25. Backtesting engine
  - Implement `src/models/backtester.py`: rolling window backtest logic
  - Implement `POST /api/v2/backtest` (async job) + `GET /api/v2/backtest/{job_id}`
  - Write `tests/test_backtester.py`
  - 🔴 **Unit gate**: `pytest tests/test_backtester.py` — all GREEN
  - _Requirements: MVP2-R3_

- [ ] 26. Portfolio simulation
  - Implement `src/models/portfolio_simulator.py`: cumulative return, Sharpe, max drawdown
  - Implement `POST /api/v2/portfolio/simulate`
  - Write `tests/test_portfolio.py`
  - 🔴 **Unit gate**: `pytest tests/test_portfolio.py` — all GREEN
  - _Requirements: MVP2-R4_

- [ ] 27. 🔴 Full MVP2 backend integration gate
  - Run `pytest tests/ -v` — ALL tests (MVP1 + MVP2) must be GREEN
  - Verify `/api/v1/` endpoints unchanged (backward compatibility)
  - **Do NOT proceed to frontend tasks until this gate is GREEN**

- [ ] 28. Frontend: Status banner + disclaimer
  - Implement `StatusBanner.jsx` (polls /health, green/amber/red)
  - Add permanent disclaimer Alert to AnalysisPage
  - Add confidence badge tooltips
  - Write Vitest unit tests
  - 🔴 **Unit gate**: `npx vitest run` — all GREEN
  - _Requirements: MVP2-R13_

- [ ] 29. Frontend: Weights settings modal
  - Implement `WeightsModal.jsx` (11 sliders, localStorage persistence)
  - Update `stockApi.js` with v2 API functions
  - Write Vitest unit tests
  - 🔴 **Unit gate**: `npx vitest run` — all GREEN
  - _Requirements: MVP2-R2_

- [ ] 30. Frontend: Enhanced candlestick chart
  - Upgrade StockDetailDrawer to candlestick + overlay toggles + zoom/pan
  - Add chart export (html-to-image)
  - Write Vitest unit tests
  - 🔴 **Unit gate**: `npx vitest run` — all GREEN
  - _Requirements: MVP2-R6_

- [ ] 31. Frontend: Backtest panel + Portfolio tab
  - Implement `BacktestPanel.jsx` + `PortfolioTab.jsx`
  - Write Vitest unit tests
  - 🔴 **Unit gate**: `npx vitest run` — all GREEN
  - _Requirements: MVP2-R3, MVP2-R4_

- [ ] 32. Frontend: Admin dashboard
  - Implement `AdminDashboard.jsx` at `/admin` route (API key gate)
  - 5 tabs: System Health, Request Metrics, Security Status, Cache Status, Dependency Versions
  - Write Vitest unit tests
  - 🔴 **Unit gate**: `npx vitest run` — all GREEN
  - _Requirements: MVP2-R13_

- [ ] 33. Frontend: Watchlist & alerts
  - Implement watchlist localStorage + polling + Web Notifications
  - Write Vitest unit tests
  - 🔴 **Unit gate**: `npx vitest run` — all GREEN
  - _Requirements: MVP2-R5_

- [ ] 34. 🔴 Full MVP2 frontend integration gate
  - Run `npx vitest run` — all GREEN
  - Run `npm run build` — zero errors
  - Run `npx playwright test` — all GREEN (update E2E tests for new UI)

- [ ] 35. 🔴 Full MVP2 release gate
  - `pytest tests/ -v` — all GREEN
  - `npx vitest run` — all GREEN
  - `npx playwright test` — all GREEN
  - `pip-audit --requirement requirements.txt --fail-on HIGH` — exits 0
  - `npm audit --audit-level=high` — exits 0
  - Security dashboard shows 15/15 checks passing
  - **MVP2 is complete only when ALL gates pass**

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["16", "17"] },
    { "id": 1, "tasks": ["18", "19", "20"] },
    { "id": 2, "tasks": ["21", "22", "23"] },
    { "id": 3, "tasks": ["24", "25", "26"] },
    { "id": 4, "tasks": ["27"] },
    { "id": 5, "tasks": ["28", "29", "30", "31"] },
    { "id": 6, "tasks": ["32", "33"] },
    { "id": 7, "tasks": ["34"] },
    { "id": 8, "tasks": ["35"] }
  ]
}
```
