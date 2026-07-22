# Implementation Plan: MVP1a Live/Near-Real-Time Multi-Source Data Polling

## Overview

Tasks 1–9 implement the MVP1a live-polling layer on top of completed MVP1. All MVP1 tests must remain GREEN throughout.

> **Prerequisite**: All MVP1 (Tasks 1–15) must be complete and all MVP1 test suites GREEN before starting MVP1a tasks.

---

## Tasks

- [ ] 1. DataProvider interface + yfinance adapter
  - Create `src/data/providers/__init__.py`
  - Create `src/data/providers/base.py` with abstract `DataProvider` class (methods: `fetch_ohlcv`, `get_live_price`, `health_check`, `provider_name`) and `ProviderError` exception
  - Create `src/data/providers/yfinance_provider.py` implementing `YFinanceProvider`:
    - `fetch_ohlcv` wraps existing `yfinance.download()` logic
    - `get_live_price` uses `yfinance.Ticker(ticker).fast_info["lastPrice"]`
    - `health_check` fetches a known ticker (^NSEI) with 1-day period
    - `provider_name` returns `"yfinance"`
  - Write `tests/test_provider_interface.py` — verify ABC enforcement (cannot instantiate base)
  - Write `tests/test_yfinance_provider.py` — mock yfinance, verify DataFrame schema, error handling
  - 🔴 **Unit gate**: `pytest tests/test_provider_interface.py tests/test_yfinance_provider.py` — all GREEN
  - _Requirements: MVP1a-R1.1, MVP1a-R1.2_
  - ⏱️ **25 min**

- [ ] 2. BSE India + NSE India provider adapters
  - Create `src/data/providers/bse_india_provider.py` implementing `BSEIndiaProvider`:
    - `fetch_ohlcv` calls BSE India historical data API
    - `get_live_price` calls BSE equity quote endpoint
    - Rate limiting: 10 req/min (sliding window via `time.monotonic()` + deque)
    - Session management: maintain `aiohttp.ClientSession` with proper headers (User-Agent, Accept)
  - Create `src/data/providers/nse_india_provider.py` implementing `NSEIndiaProvider`:
    - `fetch_ohlcv` calls NSE India historical data API
    - `get_live_price` calls NSE equity quote endpoint
    - Rate limiting: 5 req/min (sliding window)
    - Session management: requires cookie-based session init (GET homepage first)
  - Write `tests/test_bse_provider.py` — mock aiohttp, verify rate limiting, error scenarios
  - Write `tests/test_nse_provider.py` — mock aiohttp, verify session init, rate limiting
  - 🔴 **Unit gate**: `pytest tests/test_bse_provider.py tests/test_nse_provider.py` — all GREEN
  - _Requirements: MVP1a-R1.2, MVP1a-R1.6_
  - ⏱️ **30 min**

- [ ] 3. Alpha Vantage adapter + data_sources.yaml config
  - Create `src/data/providers/alpha_vantage_provider.py` implementing `AlphaVantageProvider`:
    - `fetch_ohlcv` calls TIME_SERIES_DAILY endpoint (compact/full based on period)
    - `get_live_price` calls GLOBAL_QUOTE endpoint
    - Rate limiting: 25 req/day (Alpha Vantage free tier), 5 req/min
    - Reads API key from `ALPHA_VANTAGE_API_KEY` env var
  - Create `config/data_sources.yaml` with all 4 providers configured (see design doc schema)
  - Add `pyyaml==6.0.1` and `aiohttp==3.9.5` to `requirements.txt`
  - Write `tests/test_alpha_vantage_provider.py` — mock httpx/aiohttp, verify daily limit tracking
  - 🔴 **Unit gate**: `pytest tests/test_alpha_vantage_provider.py` — all GREEN
  - _Requirements: MVP1a-R1.2, MVP1a-R1.3, MVP1a-R1.6_
  - ⏱️ **25 min**

- [ ] 4. Provider manager + fallback chain + health monitoring
  - Create `src/data/providers/provider_manager.py`:
    - `ProviderManager.__init__` loads config, instantiates adapters sorted by priority
    - `fetch_ohlcv(ticker, period, preferred_source)` — tries preferred or highest-priority, falls through on failure
    - `get_live_price(ticker, preferred_source)` — same fallback logic
    - `run_health_checks()` — calls `health_check()` on all providers, increments failure counter, auto-disables at 3
    - `reload_config()` — re-reads YAML, re-instantiates adapters (hot reload)
    - `get_status()` — returns list of provider dicts for admin UI
  - Create `src/api/routes/data_sources.py`:
    - `POST /api/v1a/config/data-sources` — calls `provider_manager.reload_config()`
    - `GET /api/v1a/config/data-sources/status` — returns provider status list
  - Wire new router into `src/api/main.py`
  - Write `tests/test_provider_manager.py` — test fallback chain, health monitoring, auto-disable after 3 failures, reload
  - 🔴 **Unit gate**: `pytest tests/test_provider_manager.py` — all GREEN
  - _Requirements: MVP1a-R1.3, MVP1a-R1.4, MVP1a-R1.5, MVP1a-R3.3, MVP1a-R3.4_
  - ⏱️ **30 min**

- [ ] 5. Live price polling + frontend banner
  - Add `apscheduler==3.10.4` to `requirements.txt`
  - Create live price polling service in `src/data/providers/live_poller.py`:
    - Uses APScheduler `BackgroundScheduler` with 60s interval
    - Only runs during market hours (9:15–15:30 IST, Mon–Fri)
    - Stores live prices in-memory dict with 60s TTL (timestamp + value)
    - At 15:30 IST bar close: triggers re-score of watched tickers
    - Market status helper: `is_market_open() -> bool`
  - Create `src/api/routes/live_prices.py`:
    - `GET /api/v1a/live-prices` — returns cached live prices + market status
  - Wire into `src/api/main.py` (start scheduler on app lifespan startup)
  - Create `frontend/src/components/LivePriceBanner.jsx`:
    - Horizontal scrolling strip with ticker, price, change %, timestamp, source badge
    - Polls `GET /api/v1a/live-prices` every 60 seconds
    - Shows "Market Closed" pill when market is closed
    - `data-testid="live-price-banner"`
  - Write `tests/test_live_price.py` — test polling logic, TTL cache, market hours detection
  - 🔴 **Unit gate**: `pytest tests/test_live_price.py` — all GREEN
  - _Requirements: MVP1a-R2.1, MVP1a-R2.2, MVP1a-R2.3, MVP1a-R2.4, MVP1a-R2.5_
  - ⏱️ **35 min**

- [ ] 6. Admin data sources tab + hot-reload endpoint
  - Create `frontend/src/components/AdminDataSourcesTab.jsx`:
    - Cloudscape Table: Provider, Status Badge (green/red/grey), Priority, Rate Limit, Usage %, Last Fetch
    - Inline actions: Enable/Disable toggle, Move Up/Down buttons for priority, Edit Rate Limit modal
    - Calls `GET /api/v1a/config/data-sources/status` on mount and on Refresh click
    - Calls `POST /api/v1a/config/data-sources` with updated config on save
    - `data-testid="admin-data-sources-tab"`
  - Add "Data Sources" tab to ObservabilityPage.jsx (new Cloudscape Tabs entry)
  - Create `frontend/src/api/dataSourceApi.js`:
    - `getDataSourceStatus()`, `reloadDataSources(config)`
  - 🔴 **Unit gate**: Manual QA — admin tab renders, toggle works, hot-reload succeeds
  - _Requirements: MVP1a-R3.1, MVP1a-R3.2_
  - ⏱️ **25 min**

- [ ] 7. Frontend source toggle dropdown
  - Create `frontend/src/components/DataSourceSelector.jsx`:
    - Cloudscape Select with options: "Auto (priority chain)", "yfinance", "BSE India", "NSE India", "Alpha Vantage"
    - Positioned above results table in AnalysisPage.jsx
    - On change: stores selection in component state, passes to analyzeStocks() as `preferred_source`
    - `data-testid="data-source-selector"`
  - Modify `frontend/src/api/stockApi.js`:
    - `analyzeStocks(tickers, preferredSource)` — adds `preferred_source` query param
  - Modify `frontend/src/pages/AnalysisPage.jsx`:
    - Add source badge column to results table (shows which provider supplied data)
    - Integrate DataSourceSelector above table
  - Modify `src/api/routes/analyze.py`:
    - Accept optional `preferred_source` parameter in AnalyzeRequest
    - Pass to provider manager's `fetch_ohlcv`
  - 🔴 **Unit gate**: Manual QA — dropdown renders, selection persists, source badge shows correct provider
  - _Requirements: MVP1a-R4.1, MVP1a-R4.2, MVP1a-R4.3_
  - ⏱️ **20 min**

- [ ] 8. Token & API consumption tracking + Usage & Limits panel
  - Create `src/observability/consumption_tracker.py`:
    - `ConsumptionTracker` class backed by SQLite WAL (`data/observability.db`, new tables)
    - Tables: `consumption_daily` (provider, date, calls, failures, tokens_in, tokens_out, cost_usd)
    - Atomic increment methods: `record_call(provider)`, `record_tokens(provider, input, output)`, `record_failure(provider)`
    - Query methods: `get_current()` → ConsumptionMetrics, `get_history(days)` → list of daily aggregates
    - Auto-reset: daily counters at midnight IST, monthly on 1st
    - Pre-flight check: `check_budget(provider) -> (bool, Optional[str])` — returns (allowed, reason)
    - Thread-safe via SQLite WAL mode; <= 2ms per increment (verified in tests)
  - Create `src/api/routes/consumption.py`:
    - `GET /api/v1a/observability/consumption` — returns current metrics
    - `GET /api/v1a/observability/consumption/history?days=30` — returns historical data
  - Create pre-flight FastAPI dependency `src/api/dependencies/budget_check.py`:
    - Injects into routes that make external API calls
    - Returns structured error if budget exhausted (provider name, reset time)
  - Wire into `src/api/main.py`
  - Create `frontend/src/components/UsageLimitsPanel.jsx`:
    - Summary cards row (Cloudscape ColumnLayout): Total calls, OpenAI tokens, cost, at-risk count
    - Provider usage table (Cloudscape Table + ProgressBar): per-provider usage %
    - OpenAI breakdown (Recharts): PieChart (input/output), LineChart (7-day), AreaChart (monthly)
    - Cost tracker: today, this month, projected, budget threshold
    - Rate limit status: per-provider remaining/min, auto-refresh 10s
    - Alert banners: warning at 80%, error at 100%
    - Auto-poll 30s + manual Refresh button
    - `data-testid="usage-limits-panel"`
  - Add "Usage & Limits" sub-panel to ObservabilityPage.jsx
  - Create `frontend/src/api/consumptionApi.js`:
    - `getConsumption()`, `getConsumptionHistory(days)`
  - Write `tests/test_consumption_tracker.py`:
    - Test atomic increments, daily reset, budget check logic, history query
  - 🔴 **Unit gate**: `pytest tests/test_consumption_tracker.py` — all GREEN
  - _Requirements: MVP1a-R5.1–MVP1a-R5.13_
  - ⏱️ **40 min**

- [ ] 9. 🔴 Full MVP1a integration gate
  - Run `pytest tests/ -v` — ALL tests (MVP1 + MVP1a) GREEN
  - Verify provider fallback chain works end-to-end (primary down → fallback succeeds)
  - Verify live price polling starts/stops based on market hours
  - Verify consumption tracker persists data and pre-flight blocks exhausted providers
  - Verify all new API endpoints return correct responses
  - Verify frontend components render correctly (manual QA):
    - LivePriceBanner shows/hides based on market status
    - DataSourceSelector changes provider
    - AdminDataSourcesTab displays provider status
    - UsageLimitsPanel shows metrics with alerts
  - **Do NOT proceed to next MVP until this passes**
  - _Requirements: All MVP1a-R1 through MVP1a-R5_
  - ⏱️ **20 min**

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"], "description": "DataProvider ABC + yfinance adapter (foundation)" },
    { "id": 1, "tasks": ["2", "3"], "description": "BSE/NSE + Alpha Vantage adapters (parallel)" },
    { "id": 2, "tasks": ["4"], "description": "Provider manager (depends on all adapters)" },
    { "id": 3, "tasks": ["5", "8"], "description": "Live polling + consumption tracker (parallel)" },
    { "id": 4, "tasks": ["6", "7"], "description": "Admin tab + source toggle (parallel, after manager)" },
    { "id": 5, "tasks": ["9"], "description": "Integration gate (after all tasks)" }
  ]
}
```

---

## Time Estimate

| Task | Estimate |
|---|---|
| Task 1: DataProvider interface + yfinance adapter | 25 min |
| Task 2: BSE/NSE provider adapters | 30 min |
| Task 3: Alpha Vantage adapter + config | 25 min |
| Task 4: Provider manager + fallback | 30 min |
| Task 5: Live polling + banner | 35 min |
| Task 6: Admin data sources tab | 25 min |
| Task 7: Frontend source toggle | 20 min |
| Task 8: Consumption tracking + panel | 40 min |
| Task 9: Integration gate | 20 min |
| **Total** | **~4.2 hrs** |
