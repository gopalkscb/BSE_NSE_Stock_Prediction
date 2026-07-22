# Implementation Plan: Bullish Stock Predictor MVP

## Overview

Implement the full-stack Bullish Stock Predictor with a strict test-first gate at every level:
**Unit tests must PASS before proceeding to the next unit. Integration tests must ALL PASS before proceeding to the next module. Playwright E2E tests must ALL PASS before the frontend is considered complete.**

Testing stack:
- **Python backend**: `pytest` (unit) + `httpx.AsyncClient` (integration) + `hypothesis` (property-based)
- **FastAPI docs**: Swagger UI enabled at `/docs`, ReDoc at `/redoc`
- **Frontend**: Vitest + React Testing Library (component unit) + Playwright (E2E and integration)

> **Gate rule**: A task marked 🔴 is a test gate. Do NOT proceed to the next task until all tests in that gate are GREEN.

---

## Tasks

- [ ] 1. Project scaffolding, shared models, and test infrastructure
  - Create package `__init__.py` files: `src/`, `src/api/`, `src/api/routes/`, `src/data/`, `src/features/`, `src/models/`, `tests/`
  - Create `src/api/models.py` with Pydantic v2 models and dataclasses: `OHLCVData`, `IndicatorSet`, `SubScores`, `ScoredTicker`, `AnalyzeRequest`, `AnalyzeResponse`
  - Create `requirements.txt` with pinned versions: `fastapi==0.111.0`, `uvicorn[standard]==0.29.0`, `pydantic==2.7.1`, `yfinance==0.2.40`, `pandas==2.2.2`, `numpy==1.26.4`, `httpx==0.27.0`, `pytest==8.2.0`, `pytest-asyncio==0.23.6`, `hypothesis==6.100.1`
  - Create `conftest.py` at project root with shared pytest fixtures (synthetic OHLCV DataFrame factory, mock yfinance patcher)
  - Create `tests/test_models.py` — unit tests asserting each Pydantic model rejects invalid data and accepts valid data
  - 🔴 **Unit gate**: Run `pytest tests/test_models.py` — all tests must be GREEN before proceeding
  - _Requirements: 8.1–8.6_


- [ ] 2. Swagger UI and API documentation setup
  - In `src/api/main.py`, configure `FastAPI(title="Bullish Stock Predictor", version="1.0.0", docs_url="/docs", redoc_url="/redoc", openapi_url="/openapi.json")`
  - Add OpenAPI metadata: description, contact, and tag groups for `analyze` and `ticker` route groups
  - Add `responses` and `summary` annotations to every route so Swagger UI renders them with descriptions and example payloads
  - Create `tests/test_swagger.py` — unit tests using `httpx.AsyncClient` to assert `/docs` returns HTTP 200, `/openapi.json` returns a valid schema containing `POST /api/v1/analyze` and `GET /api/v1/ticker/{ticker}`
  - 🔴 **Unit gate**: Run `pytest tests/test_swagger.py` — all tests must be GREEN before proceeding
  - _Requirements: 8.1_


- [ ] 3. Data fetcher module — implementation + unit tests
  - [ ] 3.1 Implement `src/data/fetch_market_data.py`
    - `apply_exchange_suffix(ticker)` — idempotent guard: return unchanged if already ends with `.NS` or `.BO`
    - `fetch_ticker(ticker, period="1y")` — `yfinance.download` wrapper; return `FetchResult(status="insufficient_data")` if <50 rows, `FetchResult(status="failed")` on exception, log errors
    - `fetch_batch(tickers)` — `ThreadPoolExecutor(max_workers=10)` for concurrent fetching within 60 s budget
    - _Requirements: 2.1–2.5_
  - [ ] 3.2 Write `tests/test_fetch.py` — unit tests for each function:
    - `test_apply_exchange_suffix_ns_idempotent` — `.NS` suffix is not doubled
    - `test_apply_exchange_suffix_bo_idempotent` — `.BO` suffix is not doubled
    - `test_apply_exchange_suffix_no_suffix_unchanged` — plain ticker returned as-is
    - `test_fetch_ticker_insufficient_data` — mock yfinance returning 30 rows → status `"insufficient_data"`, df is `None`
    - `test_fetch_ticker_exception` — mock yfinance raising exception → status `"failed"`, error message populated
    - `test_fetch_ticker_ok` — mock yfinance returning 252 rows → status `"ok"`, df has correct shape
    - `test_fetch_batch_returns_one_result_per_ticker` — batch of 3 tickers returns 3 `FetchResult` objects
    - Property test (hypothesis): any ticker ending with `.NS` or `.BO` returns unchanged from `apply_exchange_suffix`
    - Property test (hypothesis): any DataFrame with <50 rows produces `status == "insufficient_data"`
  - 🔴 **Unit gate**: Run `pytest tests/test_fetch.py` — all tests must be GREEN before proceeding to Task 4


- [ ] 4. Technical indicator calculator — implementation + unit tests
  - [ ] 4.1 Implement `src/features/indicator_calculator.py`
    - `compute_rsi(close, period=14)` — Wilder's smoothed RSI; output always in [0, 100]
    - `compute_macd(close, fast=12, slow=26, signal=9)` → `(macd_line, signal_line, histogram)`; `macd_line = fast_ema − slow_ema`
    - `compute_bollinger_bands(close, period=20, num_std=2.0)` → `(upper, middle, lower)`; `upper > middle > lower`
    - `compute_sma(close, period)` — rolling mean
    - `compute_ema(close, period)` — `pandas.ewm(span=period, adjust=False)`
    - `compute_volume_trend(volume)` → `(avg_5d, avg_20d)`
    - `compute_indicators(df, ticker)` — top-level orchestrator returning a populated `IndicatorSet` with all finite values
    - _Requirements: 3.1–3.7_
  - [ ] 4.2 Write `tests/test_indicators.py` — unit tests for each function:
    - `test_compute_rsi_range` — RSI values always in [0, 100] on synthetic 200-row close series
    - `test_compute_rsi_oversold` — declining close series produces RSI < 30
    - `test_compute_macd_line_equals_fast_minus_slow` — `macd_line == ema_12 − ema_26` at every index (within 1e-9 tolerance)
    - `test_compute_bollinger_bands_ordering` — `upper > middle > lower` for every row in a 200-row series
    - `test_compute_sma_within_window_range` — each SMA value is within `[min, max]` of its lookback window
    - `test_compute_ema_length` — output length equals input length
    - `test_compute_volume_trend_values` — returns correct averages for synthetic volume series
    - `test_compute_indicators_all_finite` — no NaN or Inf in any `IndicatorSet` field on a 252-row synthetic DataFrame
    - Property test (hypothesis): RSI always in [0, 100] for any positive close series ≥200 rows
    - Property test (hypothesis): Bollinger `upper > middle > lower` for any positive close series ≥20 rows
    - Property test (hypothesis): MACD line equals fast EMA minus slow EMA at every position
  - 🔴 **Unit gate**: Run `pytest tests/test_indicators.py` — all tests must be GREEN before proceeding to Task 5


- [ ] 5. Bullish scorer module — implementation + unit tests
  - [ ] 5.1 Implement `src/models/bullish_scorer.py`
    - `score_rsi(rsi)` — piecewise: `<30→20`, `30–50→15`, `50–70→10`, `>70→0`
    - `score_macd(macd_line, signal, hist, hist_prev)` — full alignment→20, above signal only→12, else→0
    - `score_bollinger(close, upper, middle, lower)` — `<lower→20`, `lower≤close<middle→12`, `middle≤close<upper→6`, `≥upper→0`
    - `score_moving_average(close, sma_50, sma_200)` — golden cross→20, above sma_50 only→10, else→0
    - `score_volume(vol_5d, vol_20d)` — `>120%→20`, `80–120%→10`, `<80%→0`
    - `derive_confidence(score)` — `75–100→"High"`, `50–74→"Medium"`, `0–49→"Low"`
    - `compute_projected_range(last_close, log_return_std_30)` — annualised volatility formula; both bounds positive, finite, ordered
    - `score_ticker(indicators, ohlcv_90d)` — assembles `ScoredTicker`; `bullish_score` is sum of five sub-scores, always in [0, 100]
    - `rank_tickers(scored)` — sort descending by `bullish_score`, return top 10
    - _Requirements: 4.1–4.8, 5.1–5.2_
  - [ ] 5.2 Write `tests/test_scorer.py` — unit tests for each function:
    - `test_score_rsi_all_boundaries` — verify exact outputs at boundary values 0, 29, 30, 50, 51, 70, 71, 100
    - `test_score_macd_full_bullish` — MACD above signal + positive increasing histogram → 20
    - `test_score_macd_partial` — MACD above signal only → 12
    - `test_score_macd_bearish` — MACD below signal → 0
    - `test_score_bollinger_all_four_zones` — one test per zone: below lower, lower-to-middle, middle-to-upper, above upper
    - `test_score_moving_average_golden_cross` — SMA50 > SMA200 → 20
    - `test_score_moving_average_above_sma50` — close > SMA50 but no golden cross → 10
    - `test_score_moving_average_below_all` → 0
    - `test_score_volume_all_three_thresholds` — >120%, 80–120%, <80%
    - `test_derive_confidence_all_ranges` — verify all three labels across full [0, 100] range
    - `test_compute_projected_range_ordering` — `lower ≤ last_close ≤ upper`, both positive and finite
    - `test_score_ticker_sum` — `bullish_score == rsi + macd + bollinger + ma + volume`
    - `test_rank_tickers_max_10` — list of 15 tickers returns at most 10
    - `test_rank_tickers_sorted_descending` — result is non-increasing by `bullish_score`
    - Property test (hypothesis): `bullish_score` always in [0, 100], equals sum of sub-scores for any valid `IndicatorSet`
    - Property test (hypothesis): `derive_confidence` maps every integer in [0, 100] to exactly one of "High", "Medium", "Low"
    - Property test (hypothesis): `projected_lower ≤ last_close ≤ projected_upper` for any positive inputs
    - Property test (hypothesis): ranked result length ≤ 10, non-increasing order, all items from original input
  - 🔴 **Unit gate**: Run `pytest tests/test_scorer.py` — all tests must be GREEN before proceeding to Task 6


- [ ] 6. 🔴 Backend logic integration gate
  - Run `pytest tests/test_fetch.py tests/test_indicators.py tests/test_scorer.py -v` — all must be GREEN
  - Run `pytest tests/ -v --tb=short` to confirm no cross-module regressions
  - **Do NOT proceed to Task 7 until this gate is fully GREEN**

- [ ] 7. In-memory cache — implementation + unit tests
  - [ ] 7.1 Implement `src/api/cache.py`
    - Module-level `_session_cache: dict[str, ScoredTicker] = {}` with `threading.Lock` for write safety
    - `get(ticker) -> ScoredTicker | None` — thread-safe read
    - `put(ticker, result) -> None` — acquires lock before write
    - `clear() -> None` — acquires lock, clears all entries
    - _Requirements: 7.4, 7.5_
  - [ ] 7.2 Write `tests/test_cache.py`:
    - `test_put_and_get` — put a `ScoredTicker`, get it back by key
    - `test_get_missing_returns_none` — get unknown key returns `None`
    - `test_clear_empties_cache` — after `clear()`, any `get()` returns `None`
    - `test_concurrent_writes_are_safe` — 10 threads write different keys concurrently; all 10 are retrievable
  - 🔴 **Unit gate**: Run `pytest tests/test_cache.py` — all tests must be GREEN before proceeding to Task 8


- [ ] 8. FastAPI routes — implementation + unit tests
  - [ ] 8.1 Implement `src/api/routes/analyze.py`
    - `POST /api/v1/analyze` — validate tickers (non-empty, ≤20 chars, 1–200 items); HTTP 422 on validation failure with per-ticker reasons; fetch, compute, score, rank top-10; store via `cache.put`; return `AnalyzeResponse`; HTTP 422 if all tickers fail
    - Swagger `summary`, `description`, `response_description`, and `responses={422: {...}}` annotations
    - _Requirements: 1.4, 1.5, 5.1–5.6_
  - [ ] 8.2 Implement `src/api/routes/ticker.py`
    - `GET /api/v1/ticker/{ticker}` — `cache.get` lookup; HTTP 404 with message on miss; HTTP 200 with `ScoredTicker` on hit
    - Swagger annotations for both 200 and 404 responses
    - _Requirements: 7.4, 7.5_
  - [ ] 8.3 Implement `src/api/main.py`
    - `create_app()` factory: `FastAPI` with title/version/docs_url/redoc_url, `CORSMiddleware` with `FRONTEND_ORIGIN` env var (default `"http://localhost:5173"`), include both routers
    - `app = create_app()` module-level for uvicorn
    - _Requirements: 8.1, 8.8_
  - [ ] 8.4 Write `tests/test_api.py` — unit tests using `httpx.AsyncClient(app=app, base_url="http://test")`:
    - `test_analyze_empty_ticker_list` — empty `tickers` array → HTTP 422
    - `test_analyze_ticker_too_long` — ticker >20 chars → HTTP 422 with that ticker listed in error body
    - `test_analyze_too_many_tickers` — 201 tickers → HTTP 422
    - `test_analyze_valid_request_mocked` — mock data fetcher + scorer; assert HTTP 200, `results` list present
    - `test_analyze_all_tickers_fail` — all tickers mocked to fail → HTTP 422 with failed list
    - `test_get_ticker_not_in_cache` — ticker not analysed → HTTP 404
    - `test_get_ticker_in_cache` — pre-populate cache; assert HTTP 200 with correct `ScoredTicker` body
    - `test_swagger_docs_available` — `GET /docs` → HTTP 200
    - `test_openapi_schema_has_both_endpoints` — `/openapi.json` contains both route paths
  - 🔴 **Unit gate**: Run `pytest tests/test_api.py` — all tests must be GREEN before proceeding to Task 9


- [ ] 9. 🔴 Full backend integration gate
  - Start `uvicorn src.api.main:app --reload` in background (or use `httpx.ASGITransport` in pytest)
  - Write `tests/test_integration_backend.py` — end-to-end backend integration tests using `httpx.AsyncClient`:
    - `test_full_analyze_pipeline_mocked` — POST with 3 valid mocked tickers; assert response contains `results` array, each item has all required fields (ticker, bullish_score, confidence, rsi_value, macd_signal_label, bb_signal_label, ma_signal_label, volume_signal_label, projected_lower, projected_upper)
    - `test_partial_failure_returns_200_with_failed_list` — 2 valid + 1 invalid ticker; assert HTTP 200, `results` has 2 entries, `failed` list has 1 entry
    - `test_detail_endpoint_returns_90d_ohlcv` — after analyze, GET ticker detail; assert `ohlcv_90d` list length ≤ 90
    - `test_swagger_ui_renders` — GET `/docs` returns 200 and HTML body contains "swagger"
    - `test_openapi_json_valid` — GET `/openapi.json` returns valid JSON with `paths` key containing both endpoints
    - `test_cors_headers_present` — OPTIONS request to `/api/v1/analyze` from frontend origin returns `Access-Control-Allow-Origin` header
  - Run `pytest tests/test_integration_backend.py -v` — all must be GREEN
  - Run full suite `pytest tests/ -v` to confirm no regressions
  - **Do NOT proceed to Task 10 (frontend) until this gate is fully GREEN**


- [ ] 10. Frontend scaffolding, API client, and Playwright setup
  - [ ] 10.1 Scaffold React + Vite project under `frontend/`
    - Run `npm create vite@latest frontend -- --template react`
    - Install runtime deps: `npm install @cloudscape-design/components@^3.0.0 @cloudscape-design/global-styles@^1.0.0 react@^18.3.0 react-dom@^18.3.0 recharts@^2.12.0 axios@^1.7.0`
    - Install dev/test deps: `npm install -D vitest@^1.6.0 @vitest/ui @testing-library/react@^15.0.0 @testing-library/user-event@^14.0.0 jsdom@^24.0.0 @playwright/test@^1.44.0`
    - Configure `vite.config.js` with `server.proxy` (`/api` → `http://localhost:8000`) and `test: { environment: "jsdom" }`
    - Run `npx playwright install --with-deps` to install browser binaries
    - _Requirements: 8.7_
  - [ ] 10.2 Implement `frontend/src/api/stockApi.js`
    - `analyzeStocks(tickers)` — `POST /api/v1/analyze` with `{ tickers }`, returns `AnalyzeResponse`
    - `getTickerDetail(ticker)` — `GET /api/v1/ticker/{ticker}`, throws descriptive error on 404/5xx
    - Uses `import.meta.env.VITE_API_URL` with fallback to `"http://localhost:8000"`
    - _Requirements: 6.3, 6.4, 7.1_
  - [ ] 10.3 Write `frontend/src/api/stockApi.test.js` — unit tests using `vi.mock('axios')`:
    - `test_analyzeStocks_sends_correct_payload` — verify POST body contains `tickers` array
    - `test_analyzeStocks_returns_response_data` — mock 200 response; assert return value matches
    - `test_getTickerDetail_throws_on_404` — mock 404; assert error is thrown with ticker name in message
    - `test_getTickerDetail_returns_on_200` — mock 200; assert `ScoredTicker` shape returned
  - 🔴 **Unit gate**: Run `npx vitest run src/api/stockApi.test.js` — all tests must be GREEN before proceeding to Task 11


- [ ] 11. TickerInputForm component — implementation + unit + Playwright tests
  - [ ] 11.1 Implement `frontend/src/components/TickerInputForm.jsx`
    - Cloudscape `Form` > `FormField` > `Input` (multiline) + `Button` (type="submit", `data-testid="submit-btn"`)
    - On submit: trim whitespace, deduplicate, validate (empty → inline error, >200 items → inline error), call `onSubmit(tickers[])`
    - Disable `Button` while `loading === true`
    - _Requirements: 1.1, 1.2, 1.3, 1.6_
  - [ ] 11.2 Write `frontend/src/components/TickerInputForm.test.jsx` — Vitest + RTL unit tests:
    - `test_renders_input_and_button` — input field and button present in DOM
    - `test_empty_submit_shows_validation_error` — submitting empty input renders error text
    - `test_deduplication_and_trim` — "RELIANCE.NS , reliance.ns" → `onSubmit` called with `["RELIANCE.NS"]`
    - `test_over_200_tickers_shows_error` — paste 201 tickers → shows validation error, `onSubmit` not called
    - `test_button_disabled_when_loading` — `loading=true` prop → button has `disabled` attribute
  - 🔴 **Unit gate**: Run `npx vitest run src/components/TickerInputForm.test.jsx` — all GREEN before Task 12
  - [ ] 11.3 Write `frontend/e2e/ticker-input.spec.js` — Playwright E2E tests (app must be running):
    - `test_ticker_input_visible` — navigate to `/`, assert input field is visible
    - `test_empty_submit_shows_error` — click Analyze without input, assert error message visible
    - `test_valid_ticker_enables_submit` — type a ticker, assert submit button is enabled
  - 🔴 **Playwright gate**: Run `npx playwright test e2e/ticker-input.spec.js` — all GREEN before Task 12


- [ ] 12. AnalysisPage and results table — implementation + unit + Playwright tests
  - [ ] 12.1 Implement `frontend/src/pages/AnalysisPage.jsx`
    - State: `results`, `loading`, `error`, `selectedTicker`
    - Render `<TickerInputForm>`, Cloudscape `Spinner` (while loading), Cloudscape `Alert type="error"` (on error), Cloudscape `Table` (ranked results with data-testid attributes), `<StockDetailDrawer>`
    - Table columns: Rank, Ticker, Bullish Score, Confidence Level (Cloudscape `Badge`), RSI, MACD, BB, MA, Volume signals, 30-Day Price Range
    - On row click: set `selectedTicker` to open drawer
    - _Requirements: 6.1–6.6_
  - [ ] 12.2 Write `frontend/src/pages/AnalysisPage.test.jsx` — Vitest + RTL unit tests using `vi.mock('../api/stockApi')`:
    - `test_spinner_shown_while_loading` — mock `analyzeStocks` to hang; assert spinner is in DOM
    - `test_error_alert_shown_on_api_failure` — mock `analyzeStocks` to reject; assert Alert with type "error" appears
    - `test_table_renders_results` — mock 3 scored tickers; assert 3 table rows rendered
    - `test_confidence_badge_colour` — "High" confidence renders green badge, "Low" renders grey
    - `test_row_click_opens_drawer` — click a table row; assert `selectedTicker` state changes (drawer opens)
  - 🔴 **Unit gate**: Run `npx vitest run src/pages/AnalysisPage.test.jsx` — all GREEN before proceeding
  - [ ] 12.3 Write `frontend/e2e/analysis-page.spec.js` — Playwright E2E tests (both servers running):
    - `test_full_flow_with_mocked_api` — intercept `POST /api/v1/analyze` via Playwright route mock; submit tickers; assert table appears with correct columns
    - `test_spinner_appears_during_request` — assert spinner visible while request is in-flight
    - `test_error_alert_appears_on_500` — intercept route returns 500; assert error Alert rendered
    - `test_confidence_badges_visible` — assert Badge elements are present in results table
  - 🔴 **Playwright gate**: Run `npx playwright test e2e/analysis-page.spec.js` — all GREEN before Task 13


- [ ] 13. StockDetailDrawer component — implementation + unit + Playwright tests
  - [ ] 13.1 Implement `frontend/src/components/StockDetailDrawer.jsx`
    - Props: `ticker (string|null)`, `onClose (() => void)`
    - On `ticker` change (non-null): call `getTickerDetail(ticker)`; show Cloudscape `Spinner` while loading; show Cloudscape `Alert type="error"` on 404 or error
    - Cloudscape `Drawer` containing:
      - Cloudscape `Container` + `SpaceBetween`: one row per indicator (name, value, sub-score, signal explanation) with `data-testid="indicator-row"`
      - Recharts `LineChart` showing close price + SMA-50 + SMA-200 over 90 days from `ohlcv_90d`; X-axis = date, Y-axis = price; chart has `data-testid="price-chart"`
    - _Requirements: 7.1–7.3_
  - [ ] 13.2 Write `frontend/src/components/StockDetailDrawer.test.jsx` — Vitest + RTL unit tests:
    - `test_drawer_hidden_when_ticker_null` — no ticker prop → drawer not visible
    - `test_spinner_shown_while_fetching` — mock `getTickerDetail` to hang → spinner in DOM
    - `test_indicator_rows_rendered` — mock successful response → 5 indicator rows (RSI, MACD, BB, MA, Volume)
    - `test_error_alert_on_404` — mock 404 → Alert with error type visible
    - `test_price_chart_rendered` — mock response with ohlcv_90d → chart element in DOM
  - 🔴 **Unit gate**: Run `npx vitest run src/components/StockDetailDrawer.test.jsx` — all GREEN before proceeding
  - [ ] 13.3 Write `frontend/e2e/stock-detail-drawer.spec.js` — Playwright E2E tests:
    - `test_drawer_opens_on_row_click` — submit tickers (mocked API); click a table row; assert drawer is visible
    - `test_drawer_shows_indicator_breakdown` — mock `GET /api/v1/ticker/X`; assert indicator rows visible in drawer
    - `test_drawer_shows_price_chart` — assert chart element rendered in drawer
    - `test_drawer_closes_on_close_button` — click close; assert drawer hidden
    - `test_drawer_shows_error_on_404` — intercept ticker detail route with 404; assert error Alert in drawer
  - 🔴 **Playwright gate**: Run `npx playwright test e2e/stock-detail-drawer.spec.js` — all GREEN before Task 14


- [ ] 14. Wire App.jsx and final frontend integration
  - [ ] 14.1 Update `frontend/src/App.jsx`
    - Import `@cloudscape-design/global-styles/index.css`
    - Render `<AnalysisPage />` as root; `StockDetailDrawer` is managed inside `AnalysisPage` via `selectedTicker` state
    - _Requirements: 6.1, 6.6, 7.1_
  - 🔴 **Unit gate**: Run `npx vitest run` (full Vitest suite) — all GREEN before proceeding
  - 🔴 **Build gate**: Run `npm run build` inside `frontend/` — must complete with zero errors before Task 15

- [ ] 15. 🔴 Full-stack integration gate — Playwright E2E suite
  - Write `frontend/e2e/full-stack.spec.js` — end-to-end tests against live backend + frontend (both servers running):
    - `test_submit_real_tickers_returns_table` — type `RELIANCE.NS,TCS.NS` → submit → table renders with ≤10 rows and required columns
    - `test_bullish_score_column_is_numeric` — all Bullish Score cells contain integers 0–100
    - `test_confidence_badges_display` — at least one Badge is visible in the results table
    - `test_row_click_opens_drawer_with_chart` — click first row → drawer opens → price chart is visible
    - `test_swagger_ui_accessible` — navigate to `http://localhost:8000/docs` → page title contains "Swagger UI"
    - `test_swagger_ui_shows_analyze_endpoint` — Swagger UI page contains text `/api/v1/analyze`
    - `test_swagger_ui_shows_ticker_endpoint` — Swagger UI page contains text `/api/v1/ticker`
  - Run `npx playwright test e2e/full-stack.spec.js --reporter=html` — all tests must be GREEN
  - Run full pytest suite `pytest tests/ -v` — all must be GREEN
  - Run full Vitest suite `npx vitest run` — all must be GREEN
  - **All three test suites must be GREEN. The spec is complete only when this gate passes.**


---

## Notes

- 🔴 **Gate rule enforced**: Every task has an explicit test gate. Implementation does not advance until the gate is GREEN. If a gate fails, fix the implementation — do not skip or comment out tests.
- **Swagger UI** is available at `http://localhost:8000/docs` once the backend is running. Use it to manually test endpoints during development.
- **Backend start**: `uvicorn src.api.main:app --reload` from the project root
- **Frontend dev server**: `npm run dev` inside `frontend/` (starts on `http://localhost:5173`)
- **Playwright** requires both servers running. Start both before running `npx playwright test`
- **Playwright config** (`frontend/playwright.config.js`) should set `baseURL: "http://localhost:5173"` and `webServer` to auto-start both servers for CI
- Property-based tests use `hypothesis` (Python) — included in `requirements.txt`
- Vitest is the JS unit test runner; Playwright handles all browser-level testing
- Tasks 3–9 are pure Python; Tasks 10–14 are pure JS/JSX — can be developed in parallel after Task 9 (backend gate) passes
- The in-memory cache has no TTL; a server restart clears all results

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "3.1", "4.1", "5.1"] },
    { "id": 2, "tasks": ["3.2", "4.2", "5.2"] },
    { "id": 3, "tasks": ["6"] },
    { "id": 4, "tasks": ["7.1", "7.2", "8.1", "8.2", "8.3"] },
    { "id": 5, "tasks": ["7.3", "8.4"] },
    { "id": 6, "tasks": ["9"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 8, "tasks": ["11.1", "11.2", "11.3", "12.1"] },
    { "id": 9, "tasks": ["12.2", "12.3", "13.1"] },
    { "id": 10, "tasks": ["13.2", "13.3", "14.1"] },
    { "id": 11, "tasks": ["15"] }
  ]
}
```
