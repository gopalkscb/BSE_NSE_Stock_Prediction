# MVP1a — Live Data Polling (Multi-Source, Admin, Consumption)

Extends MVP1 with live/near-real-time market data from multiple configurable sources, admin data source management, and a comprehensive token & API consumption dashboard.

**Status:** ✅ Specs Complete — Ready to build (after MVP1 gate)

---

## Prerequisite

MVP1 complete — all Tasks 1–15 done and smoke tests GREEN.

---

## What MVP1a Adds

| Feature | Description |
|---|---|
| Pluggable DataProvider interface | Abstract base with 4 adapters: yfinance, BSE India, NSE India, Alpha Vantage |
| Priority fallback chain | If primary provider fails, auto-tries next in priority order |
| Live price polling | 60-second polling during market hours (9:15–15:30 IST, Mon–Fri) |
| Auto-rescore on close | Re-scores all watched tickers when market closes at 15:30 IST |
| Admin Data Sources tab | Enable/disable, reorder priority, health monitoring (auto-disable after 3 failures) |
| Frontend source selector | Dropdown to choose provider ("Auto" or specific); source badge on results |
| Consumption dashboard | Usage & Limits panel: API calls, tokens, cost tracking, budget alerts |
| Pre-flight budget checks | FastAPI dependency blocks calls when provider budget is exhausted |
| Hot-reload config | `POST /api/v1a/config/data-sources` to reload without server restart |

---

## Architecture

```
Browser (React SPA)
├── LivePriceBanner (scrolling ticker strip)
├── DataSourceSelector (provider dropdown)
├── AdminDataSourcesTab (status/priority/health)
└── UsageLimitsPanel (metrics + alerts)
        │
        ▼ HTTP/JSON (CORS)
FastAPI Backend
├── ProviderManager (fallback + health + rate-limit)
│   ├── YFinanceProvider
│   ├── BSEIndiaProvider
│   ├── NSEIndiaProvider
│   └── AlphaVantageProvider
├── Live Price Poller (APScheduler 60s)
├── Consumption Tracker (SQLite WAL)
└── Budget Pre-flight (FastAPI Depends)
```

---

## New API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1a/config/data-sources` | Hot-reload data sources config |
| GET | `/api/v1a/config/data-sources/status` | Provider status list (admin) |
| GET | `/api/v1a/live-prices` | Cached live prices + market status |
| GET | `/api/v1a/observability/consumption` | Current consumption metrics |
| GET | `/api/v1a/observability/consumption/history?days=30` | Daily aggregates for trending |

---

## New Frontend Components

| Component | Purpose |
|---|---|
| `LivePriceBanner.jsx` | Horizontal scrolling price strip with change %, source badge, market status |
| `DataSourceSelector.jsx` | Cloudscape Select to choose active data source |
| `AdminDataSourcesTab.jsx` | Provider management table (status, priority, rate limit, actions) |
| `UsageLimitsPanel.jsx` | Summary cards, provider table, OpenAI charts, cost tracker, rate limit status |

---

## New Dependencies

| Library | Version | Purpose |
|---|---|---|
| `apscheduler` | 3.10.4 | Background scheduler for 60s polling + 5min health checks |
| `pyyaml` | 6.0.1 | Parse `config/data_sources.yaml` |
| `aiohttp` | 3.9.5 | Async HTTP client for BSE/NSE India API adapters |

---

## New Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ALPHA_VANTAGE_API_KEY` | — | Alpha Vantage free-tier API key |
| `BSE_API_BASE_URL` | `https://api.bseindia.com` | BSE India API base URL |
| `NSE_API_BASE_URL` | `https://www.nseindia.com/api` | NSE India API base URL |
| `API_MONTHLY_BUDGET_USD` | `10.0` | Monthly cost alert threshold (USD) |
| `OPENAI_MONTHLY_TOKEN_LIMIT` | `1000000` | Monthly OpenAI token hard limit |
| `ALPHA_VANTAGE_DAILY_LIMIT` | `25` | Alpha Vantage free tier daily call limit |
| `YFINANCE_RATE_LIMIT_PER_MIN` | `100` | yfinance max requests per minute |
| `BSE_RATE_LIMIT_PER_MIN` | `10` | BSE India max requests per minute |
| `NSE_RATE_LIMIT_PER_MIN` | `5` | NSE India max requests per minute |
| `POLLING_INTERVAL_SECONDS` | `60` | Live price polling interval |
| `HEALTH_CHECK_INTERVAL_MIN` | `5` | Provider health check interval (minutes) |

---

## New File Layout

```
src/data/providers/
├── __init__.py
├── base.py                    # DataProvider ABC + ProviderError
├── yfinance_provider.py       # YFinanceProvider adapter
├── bse_india_provider.py      # BSEIndiaProvider adapter
├── nse_india_provider.py      # NSEIndiaProvider adapter
├── alpha_vantage_provider.py  # AlphaVantageProvider adapter
├── provider_manager.py        # ProviderManager (fallback, health, rate-limit)
└── live_poller.py             # APScheduler-based live price poller

src/api/routes/
├── data_sources.py            # POST/GET data source config + status
├── live_prices.py             # GET /api/v1a/live-prices
└── consumption.py             # GET consumption + history

src/api/dependencies/
└── budget_check.py            # Pre-flight budget FastAPI dependency

src/observability/
└── consumption_tracker.py     # SQLite WAL counters + pre-flight logic

config/
└── data_sources.yaml          # Provider config (committed)

frontend/src/components/
├── LivePriceBanner.jsx
├── DataSourceSelector.jsx
├── AdminDataSourcesTab.jsx
└── UsageLimitsPanel.jsx

frontend/src/api/
├── dataSourceApi.js           # Data sources API client
└── consumptionApi.js          # Consumption metrics API client

tests/
├── test_provider_interface.py
├── test_yfinance_provider.py
├── test_bse_provider.py
├── test_nse_provider.py
├── test_alpha_vantage_provider.py
├── test_provider_manager.py
├── test_live_price.py
└── test_consumption_tracker.py
```

---

## Implementation Tasks (9 tasks, ~4.2 hrs)

| # | Task | Est. | Depends On |
|---|---|---|---|
| 1 | DataProvider interface + yfinance adapter | 25 min | — |
| 2 | BSE India + NSE India provider adapters | 30 min | Task 1 |
| 3 | Alpha Vantage adapter + data_sources.yaml config | 25 min | Task 1 |
| 4 | Provider manager + fallback chain + health monitoring | 30 min | Tasks 2, 3 |
| 5 | Live price polling + frontend banner | 35 min | Task 4 |
| 6 | Admin data sources tab + hot-reload endpoint | 25 min | Task 4 |
| 7 | Frontend source toggle dropdown | 20 min | Task 4 |
| 8 | Token & API consumption tracking + Usage & Limits panel | 40 min | Task 4 |
| 9 | Full MVP1a integration gate | 20 min | Tasks 5–8 |

### Task Dependency Graph

```
Wave 0: [1] DataProvider ABC + yfinance adapter
Wave 1: [2, 3] BSE/NSE + Alpha Vantage (parallel)
Wave 2: [4] Provider manager (depends on all adapters)
Wave 3: [5, 8] Live polling + consumption tracker (parallel)
Wave 4: [6, 7] Admin tab + source toggle (parallel)
Wave 5: [9] Integration gate (after all)
```

---

## Requirements Summary

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| MVP1a-R1 | Multi-Source DataProvider Interface | 6 criteria (ABC, 4 adapters, YAML config, hot-reload, fallback, rate limiting) |
| MVP1a-R2 | Live/Near-Real-Time Data Streaming | 5 criteria (60s poll, banner, rescore on close, TTL cache, market closed state) |
| MVP1a-R3 | Admin Data Source Management | 4 criteria (status tab, enable/disable/reorder, health monitoring, failover logging) |
| MVP1a-R4 | Frontend Source Toggle | 3 criteria (dropdown, source badge, re-run with different source) |
| MVP1a-R5 | Token & API Consumption Dashboard | 13 criteria (full tracking, endpoints, history, reset, budget check, alerts, UI panel) |

---

## Spec Files

| Document | Path |
|---|---|
| Requirements | [requirements.md](.kiro/specs/mvp1a-live-polling/requirements.md) |
| Design | [design.md](.kiro/specs/mvp1a-live-polling/design.md) |
| Tasks | [tasks.md](.kiro/specs/mvp1a-live-polling/tasks.md) |

---

## Key Commands

```bash
uvicorn src.api.main:app --reload        # Backend (with live polling)
cd frontend && npm run dev               # Frontend
pytest tests/ -v                         # All tests (MVP1 + MVP1a)
```

---

## Gate Rule

All MVP1a tasks (1–9) must be complete and all tests GREEN before proceeding to MVP2.

---

## Relationship to Other MVPs

- **MVP1 → MVP1a**: MVP1a requires MVP1 complete (all smoke tests GREEN)
- **MVP1a → MVP2**: MVP2 extends MVP1 + MVP1a (all 9 tasks must be complete)
- **MVP1a → MVP4**: MVP4 depends on MVP1a for its live data layer (providers + polling)
- **MVP1a is independent of**: MVP1b (test hardening) and MVP3 (mobile)
