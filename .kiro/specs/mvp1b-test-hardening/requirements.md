
# MVP1b Requirements Document — Test Hardening

## Introduction

MVP1b is a test-hardening sprint that backfills comprehensive test coverage deferred from MVP1's 2-hour build scope. It upgrades the test suite from basic smoke tests (~10) to a full production-grade suite (~80+ unit tests, property-based tests, integration tests, and E2E tests). MVP1b is a prerequisite gate before MVP3 mobile development begins.

**Prerequisite:** MVP1 complete (Tasks 1–15 all GREEN).
**Gate rule:** ALL T1–T7 tasks must be GREEN before starting MVP3 mobile development.

---

## Requirements

### Requirement 1 — Property-Based Tests (hypothesis)

**User Story:** As a developer, I want mathematical invariants verified across random inputs so scoring and indicator functions are provably correct.

#### Acceptance Criteria

1. THE test suite SHALL include at least 9 property-based tests using the `hypothesis` library covering:
   - RSI always in [0, 100] for any positive close series ≥200 rows
   - Bollinger Bands: upper > middle > lower for any positive close series ≥20 rows
   - MACD line equals fast EMA minus slow EMA at every position
   - Bullish Score always in [0, 100] and equals sum of sub-scores for any valid IndicatorSet
   - Each sub-score is in [0, 20]
   - `derive_confidence` maps every integer in [0, 100] to exactly one of "High", "Medium", "Low"
   - `projected_lower ≤ last_close ≤ projected_upper` for any positive inputs
   - Ranked result length ≤ 10, non-increasing order, all items from original input
   - Exchange suffix application is idempotent
2. ALL property tests SHALL pass within a 60-second timeout per test.
3. Property tests SHALL be in `tests/test_properties.py`.

---

### Requirement 2 — Full Python Unit Test Suite

**User Story:** As a developer, I want every public function covered by at least 2 unit tests so regressions are caught immediately.

#### Acceptance Criteria

1. THE test suite SHALL expand from ~10 smoke tests to ~80 comprehensive unit tests.
2. EVERY public function in `src/data/`, `src/features/`, `src/models/`, `src/api/` SHALL have at least 2 unit tests covering: happy path and at least one edge case or error path.
3. Boundary values SHALL be explicitly tested for all piecewise scoring functions (RSI: 0, 29, 30, 50, 51, 70, 71, 100; MACD: all 3 states; Bollinger: all 4 zones; MA: all 3 states; Volume: all 3 thresholds).
4. All tests SHALL pass with `pytest tests/ -v` in under 30 seconds.

---

### Requirement 3 — Backend Integration Tests

**User Story:** As a developer, I want end-to-end backend pipeline tests so I can verify the full analyze→score→cache→detail flow.

#### Acceptance Criteria

1. `tests/test_integration_backend.py` SHALL use `httpx.AsyncClient` with `ASGITransport` (no live network calls).
2. THE integration tests SHALL cover:
   - Full analyze pipeline (POST → response with all required fields)
   - Partial failure handling (2 valid + 1 invalid ticker)
   - Detail endpoint returns ≤90 days OHLCV after analyze
   - Swagger UI renders (GET /docs returns 200)
   - OpenAPI JSON is valid and contains both endpoints
   - CORS headers present on OPTIONS request
3. ALL integration tests SHALL pass without any external network dependency.

---

### Requirement 4 — Frontend Unit Tests (Vitest + React Testing Library)

**User Story:** As a developer, I want every frontend component tested in isolation so UI regressions are caught.

#### Acceptance Criteria

1. EVERY component in `frontend/src/components/` SHALL have a co-located `*.test.jsx` file.
2. EVERY page in `frontend/src/pages/` SHALL have a co-located `*.test.jsx` file.
3. THE API client (`frontend/src/api/stockApi.js`) SHALL have unit tests mocking axios.
4. Tests SHALL cover: rendering, user interaction, error states, loading states, prop validation.
5. ALL frontend tests SHALL pass with `cd frontend && npx vitest run`.

---

### Requirement 5 — Playwright E2E Tests

**User Story:** As a developer, I want browser-level tests covering the full user journey so I can verify the app works end-to-end.

#### Acceptance Criteria

1. THE E2E suite SHALL include 6 spec files in `frontend/e2e/`:
   - `ticker-input.spec.js` — form validation, empty submit, valid input
   - `analysis-page.spec.js` — table rendering, spinner, error states, badges
   - `stock-detail-drawer.spec.js` — drawer open/close, indicators, chart
   - `observability.spec.js` — observability tab navigation + panels
   - `full-stack.spec.js` — live backend + frontend integration
   - `observability-full-stack.spec.js` — live observability data
2. Isolation tests SHALL use `page.route()` to mock API responses.
3. `full-stack.spec.js` SHALL run against live backend + frontend (both servers running).
4. ALL E2E tests SHALL pass with `cd frontend && npx playwright test`.

---

### Requirement 6 — Concurrent Batch Fetching (ThreadPoolExecutor)

**User Story:** As an operator, I want batch ticker fetching to be concurrent so large batches complete within the 60-second timeout.

#### Acceptance Criteria

1. `fetch_batch()` SHALL use `ThreadPoolExecutor(max_workers=10)` for concurrent fetching.
2. THE batch SHALL have a hard timeout of 60 seconds total.
3. Tickers not completed within the timeout SHALL be marked `"timeout"` in the failed list.
4. Unit tests SHALL verify concurrent execution completes faster than sequential for ≥5 tickers.

---

### Requirement 7 — Full Swagger Annotations

**User Story:** As a developer, I want complete Swagger documentation so API consumers can understand every endpoint without reading code.

#### Acceptance Criteria

1. EVERY route SHALL have `summary`, `description`, `response_description`, and `responses` annotations.
2. Error responses (422, 404, 500) SHALL include example response bodies in the OpenAPI schema.
3. Request body models SHALL include `json_schema_extra` with example values.
4. THE OpenAPI schema SHALL be validated by test: `GET /openapi.json` contains descriptions for all endpoints and all response codes.
