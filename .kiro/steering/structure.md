# Project Structure

## Full Layout

```
BSE_NSE_Stock_Prediction/
│
├── src/                            # Python backend source code
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app factory; CORS; Swagger config
│   │   ├── cache.py                # In-memory session cache (thread-safe dict)
│   │   ├── models.py               # Pydantic v2 models + dataclasses
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── analyze.py          # POST /api/v1/analyze
│   │       ├── ticker.py           # GET  /api/v1/ticker/{ticker}
│   │       └── observability.py    # GET  /api/v1/observability/* (metrics, errors, health, faq)
│   ├── data/
│   │   ├── __init__.py
│   │   └── fetch_market_data.py    # yfinance wrapper; FetchResult; batch fetching
│   ├── features/
│   │   ├── __init__.py
│   │   └── indicator_calculator.py # RSI, MACD, Bollinger Bands, SMA, EMA, Volume
│   ├── models/
│   │   ├── __init__.py
│   │   └── bullish_scorer.py       # Sub-score functions; rank_tickers; projected range
│   └── observability/
│       ├── __init__.py
│       ├── store.py                # SQLite store (aiosqlite): metrics, errors, ticker_health
│       ├── middleware.py           # ObservabilityMiddleware: request count + duration + errors
│       └── timing.py              # @timed decorator + TimingContext for pipeline instrumentation
│
├── tests/                          # pytest test suite
│   ├── __init__.py
│   ├── conftest.py                 # Shared fixtures (synthetic OHLCV factory, mocks)
│   ├── test_models.py              # Pydantic model validation
│   ├── test_swagger.py             # Swagger UI + OpenAPI schema tests
│   ├── test_fetch.py               # Data fetcher unit + property tests
│   ├── test_indicators.py          # Indicator calculator unit + property tests
│   ├── test_scorer.py              # Scorer unit + property tests
│   ├── test_cache.py               # Cache unit tests
│   ├── test_api.py                 # Route unit tests (httpx AsyncClient)
│   └── test_integration_backend.py # Full backend integration tests
│
├── frontend/                       # React + Cloudscape frontend
│   ├── src/
│   │   ├── App.jsx                 # Root component; imports Cloudscape global styles
│   │   ├── api/
│   │   │   ├── stockApi.js         # analyzeStocks(), getTickerDetail()
│   │   │   └── observabilityApi.js # getMetrics(), getErrors(), getTickerHealth(), getFaq()
│   │   ├── pages/
│   │   │   ├── AnalysisPage.jsx    # Main view: input + results table + drawer
│   │   │   └── ObservabilityPage.jsx # Observability tab: 3-panel layout
│   │   └── components/
│   │       ├── TickerInputForm.jsx  # Cloudscape Form + validation
│   │       ├── StockDetailDrawer.jsx # Indicator breakdown + Recharts price chart
│   │       ├── MetricsPanel.jsx    # Live metrics cards + ticker health table
│   │       ├── ErrorLogPanel.jsx   # Paginated error/warning log table
│   │       └── FaqPanel.jsx        # Searchable FAQ accordion (4 categories)
│   ├── e2e/                        # Playwright E2E test suites (MVP1b+)
│   │   ├── ticker-input.spec.js
│   │   ├── analysis-page.spec.js
│   │   ├── stock-detail-drawer.spec.js
│   │   ├── observability.spec.js   # Observability tab E2E tests
│   │   └── full-stack.spec.js      # Live backend + frontend integration
│   ├── playwright.config.js
│   ├── vite.config.js              # Dev proxy: /api → http://localhost:8000
│   └── package.json
│
├── data/                           # Market data and ticker reference lists
│   ├── tickers/                    # Pre-built ticker lists (committed, not gitignored)
│   │   ├── __init__.py             # Package exports: NSE_TICKERS, BSE_TICKERS, sub-lists
│   │   ├── nse_tickers.py          # NSE_TICKERS (500, .NS suffix) + NIFTY_50/BANK/IT/PHARMA/AUTO
│   │   ├── bse_tickers.py          # BSE_TICKERS (500, numeric .BO codes) + SENSEX_30 + NAME_MAP
│   │   └── build_csv.py            # CLI utility: generates CSV snapshots from ticker lists
│   ├── observability.db            # SQLite observability store (gitignored, created at runtime)
│   ├── raw/                        # Downloaded OHLCV CSVs / Parquet (gitignored)
│   └── processed/                  # Feature-engineered data (gitignored)
│
├── docs/                           # Documentation and knowledge base
│   └── faq.json                    # Static FAQ: 4 categories, 28+ entries (committed)
│
├── notebooks/                      # Jupyter notebooks for EDA (exploration only)
│
├── requirements.txt                # Pinned Python dependencies
├── .env                            # Local secrets (gitignored)
├── .gitignore
└── README.md
```

## Conventions

### Python backend
- All business logic lives in `src/` as importable modules — never in notebooks or a top-level script
- `src/api/models.py` owns all shared data models (Pydantic classes and dataclasses); no model definitions elsewhere
- `src/api/cache.py` is the only place session state is stored; routes import from it
- Route handlers in `src/api/routes/` are thin orchestrators — they call data/features/models modules, not implement logic directly
- Module naming: `snake_case` for all files and directories
- Data pipeline scripts prefixed with stage: `fetch_`, `clean_`, `feature_`, `train_`, `evaluate_`

### Testing (Python)
- Test files mirror `src/` structure: `tests/test_fetch.py` for `src/data/fetch_market_data.py`
- Every public function must have at least one unit test before it is considered complete
- Property-based tests (`hypothesis`) cover mathematical invariants (scoring bounds, indicator ranges)
- Integration tests use `httpx.AsyncClient` with `ASGITransport` — no live network calls in CI
- **Gate rule**: all tests in a module's test file must be GREEN before implementation moves to the next module

### Frontend
- `frontend/src/api/` — API client only; no UI code
- `frontend/src/pages/` — page-level components (route views); one file per page
- `frontend/src/components/` — reusable components; co-located `*.test.jsx` file required
- Cloudscape components are imported from `@cloudscape-design/components`; global styles imported once in `App.jsx`
- `data-testid` attributes are required on all interactive and key display elements for Playwright selectors
- `frontend/e2e/` — Playwright tests only; no unit test code here

### Playwright E2E
- One spec file per feature area (input form, results table, detail drawer, full-stack)
- API responses are mocked via `page.route()` in isolation tests; `full-stack.spec.js` uses the live backend
- `playwright.config.js` sets `baseURL: "http://localhost:5173"` and defines `webServer` entries to auto-start both servers
- **Gate rule**: Playwright suites must be GREEN before the frontend feature is marked complete

### Data and artifacts
- `data/tickers/` — **committed** to the repo; contains curated NSE and BSE ticker lists used as input to the application
- `data/raw/` and `data/processed/` — never commit; document the fetch process in notebooks
- Model artifacts (`.pkl`, `.h5`, `.pt`) — never commit; store locally and gitignore
- Configuration (ticker lists, hyperparameters) — externalise to YAML/JSON or environment variables; never hardcode

### Ticker lists (`data/tickers/`)
- `nse_tickers.py` exports `NSE_TICKERS` (~500 symbols, `.NS` suffix) and sector sub-lists: `NIFTY_50`, `NIFTY_BANK`, `NIFTY_IT`, `NIFTY_PHARMA`, `NIFTY_AUTO`
- `bse_tickers.py` exports `BSE_TICKERS` (~500 symbols, numeric `.BO` codes), `SENSEX_30`, `NAME_MAP` dict (scrip code → company name), and `get_ticker_name(scrip_code)` helper
- `data/tickers/__init__.py` re-exports everything — always import via `from data.tickers import NSE_TICKERS` rather than the sub-module directly
- Both files include a `if __name__ == "__main__":` block for quick sanity-check counts; run with `python -m data.tickers.nse_tickers` or `python -m data.tickers.bse_tickers`
- NSE uses symbol-based tickers (e.g. `RELIANCE.NS`); BSE uses numeric scrip codes (e.g. `500325.BO`) — never mix the two formats in the same list
- `build_csv.py` is a standalone CLI utility that writes CSV snapshots of all ticker lists to `data/tickers/`; run with `python -m data.tickers.build_csv` from the project root. It produces: `nse_tickers.csv`, `bse_tickers.csv`, `nse_nifty50.csv`, `nse_nifty_bank.csv`, `nse_nifty_it.csv`, `nse_nifty_pharma.csv`, `nse_nifty_auto.csv`, `bse_sensex30.csv`. The generated CSVs are co-located in `data/tickers/` and may be committed if needed for tooling that prefers flat files over Python imports.

### Environment variables
- `.env` at project root — never commit
- `FRONTEND_ORIGIN` — CORS allowed origin for the backend (default: `http://localhost:5173`)
- `VITE_API_URL` — backend URL used by the frontend (default: `http://localhost:8000`)
- Use `python-dotenv` or OS env vars to load `.env` in Python; Vite reads `.env` automatically
