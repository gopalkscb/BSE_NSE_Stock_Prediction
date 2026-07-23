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
│   │       ├── intraday.py         # GET  /api/v1/intraday/{ticker} (Alpha Vantage + yfinance)
│   │       ├── observability.py    # GET  /api/v1/observability/* (metrics, errors, health, faq)
│   │       └── rag.py              # POST /api/v4/rag/ingest, /query; GET /status, /eval/*
│   ├── data/
│   │   ├── __init__.py
│   │   ├── fetch_market_data.py    # yfinance wrapper; FetchResult; batch fetching
│   │   └── alpha_vantage_intraday.py # Alpha Vantage GLOBAL_QUOTE + yfinance intraday bars
│   ├── features/
│   │   ├── __init__.py
│   │   └── indicator_calculator.py # RSI, MACD, Bollinger Bands, SMA, EMA, Volume
│   ├── models/
│   │   ├── __init__.py
│   │   └── bullish_scorer.py       # Sub-score functions; rank_tickers; projected range
│   ├── observability/
│   │   ├── __init__.py
│   │   ├── store.py                # SQLite store (aiosqlite): metrics, errors, ticker_health
│   │   ├── middleware.py           # ObservabilityMiddleware: request count + duration + errors
│   │   └── timing.py              # @timed decorator + TimingContext for pipeline instrumentation
│   └── rag/                        # RAG pipeline (MVP4)
│       ├── __init__.py
│       ├── pinecone_client.py      # Pinecone vector DB CRUD (serverless, delete-and-replace)
│       ├── ingest.py               # RSS feed ingestion → chunk → embed → BM25 sparse → upsert
│       ├── retriever.py            # Hybrid retrieval: dense (OpenAI) + sparse (BM25) + RRF
│       ├── generator.py            # AI signal explanations (GPT-4o-mini, grounded in context)
│       ├── evaluator.py            # RAG evaluation: precision@k, recall@k, MRR, faithfulness
│       ├── eval_store.py           # SQLite store for evaluation results + replace-on-threshold pruning (50)
│       ├── seed_eval.py            # Auto-seed 20 eval records + 400 per-query records on startup
│       └── orchestrator.py         # APScheduler pipeline orchestration + circuit breaker
│
├── tests/                          # pytest test suite
│   ├── __init__.py
│   ├── test_models.py              # Pydantic model validation
│   ├── test_fetch.py               # Data fetcher unit tests
│   ├── test_indicators.py          # Indicator calculator unit tests
│   ├── test_scorer.py              # Scorer unit tests
│   ├── test_api.py                 # Route unit tests (httpx AsyncClient)
│   ├── test_observability_store.py # Observability SQLite store tests
│   ├── test_observability_middleware.py # Middleware unit tests
│   ├── test_faq.py                 # FAQ endpoint tests
│   ├── test_pinecone_client.py     # Pinecone client unit tests (MVP4)
│   ├── test_rag_ingest.py          # RAG ingestion pipeline tests (MVP4)
│   ├── test_rag_embedding.py       # Embedding + BM25 sparse tests (MVP4)
│   ├── test_rag_retriever.py       # Hybrid retrieval tests (MVP4)
│   ├── test_rag_generator.py       # AI explanation generation tests (MVP4)
│   ├── test_rag_evaluator.py       # RAG evaluation metrics tests (MVP4)
│   ├── test_rag_eval_storage.py    # Eval storage tests (MVP4)
│   └── test_rag_orchestration.py   # Orchestration + circuit breaker tests (MVP4)
│
├── frontend/                       # React + Cloudscape frontend (DM Sans font, custom teal theme)
│   ├── src/
│   │   ├── App.jsx                 # Root component; 5 tabs: Analysis, Intraday, RAG Reference, Observability, FAQ
│   │   ├── theme.css               # Custom theme: DM Sans font-family, green-blue teal palette, gradient pills, color-coded badges
│   │   ├── data/
│   │   │   └── tickerPresets.js    # Pre-built ticker list presets (NIFTY_50, SENSEX_30, ETFs, etc.)
│   │   ├── api/
│   │   │   ├── stockApi.js         # analyzeStocks(), getTickerDetail()
│   │   │   └── observabilityApi.js # getMetrics(), getErrors(), getTickerHealth(), getFaq()
│   │   ├── pages/
│   │   │   ├── AnalysisPage.jsx    # Main view: input + results table (stripedRows, gradient pills) + drawer
│   │   │   ├── LiveDataPage.jsx    # Intraday tab: Alpha Vantage GLOBAL_QUOTE + yfinance intraday (RSI, MACD, VWAP, score)
│   │   │   └── ObservabilityPage.jsx # Observability tab: 3-panel layout
│   │   └── components/
│   │       ├── TickerInputForm.jsx  # Cloudscape Form + validation
│   │       ├── StockDetailDrawer.jsx # Indicator breakdown + Recharts price chart
│   │       ├── AskAIPanel.jsx      # Conversational ticker Q&A chat panel (MVP4)
│   │       ├── AskAIDrawer.jsx     # AI explanation drawer for individual tickers (MVP4)
│   │       ├── RAGDashboardTab.jsx # RAG evaluation dashboard + cost tracking (MVP4)
│   │       ├── MetricsPanel.jsx    # Live metrics cards + ticker health table
│   │       ├── ErrorLogPanel.jsx   # Paginated error/warning log table
│   │       └── FaqPanel.jsx        # Searchable FAQ accordion (5 categories)
│   ├── e2e/                        # Playwright E2E test suites (15 spec files, 119 tests, 6 projects)
│   │   ├── ticker-input.spec.js           # Ticker input form tests
│   │   ├── analysis-page.spec.js          # Analysis results page tests
│   │   ├── stock-detail-drawer.spec.js    # Detail drawer tests
│   │   ├── observability.spec.js          # Observability tab tests
│   │   ├── observability-full-stack.spec.js # Observability live integration
│   │   ├── full-stack.spec.js             # Live backend + frontend integration
│   │   ├── admin-data-sources.spec.js     # MVP1a: admin data source management
│   │   ├── data-source-selector.spec.js   # MVP1a: source selector UI
│   │   ├── live-price-banner.spec.js      # MVP1a: live price display
│   │   ├── mvp1a-integration.spec.js      # MVP1a: full integration
│   │   ├── usage-limits-panel.spec.js     # MVP1a: usage & limits panel
│   │   ├── mvp2-admin-dashboard.spec.js   # MVP2: admin dashboard
│   │   ├── mvp2-security.spec.js          # MVP2: security features
│   │   ├── mvp2-weighted-scoring.spec.js  # MVP2: weighted scoring UI
│   │   └── mvp4-rag-chat.spec.js          # MVP4: RAG chat panel (11 tests)
│   ├── playwright.config.js
│   ├── vite.config.js              # Dev proxy: /api → http://localhost:8000
│   └── package.json
│
├── config/                         # Pipeline and service configuration (committed)
│   └── rag_pipeline.yaml           # RAG ingestion schedule, RSS feeds (financial + commodity), chunking params, model config
│
├── data/                           # Market data, ticker reference lists, and runtime DBs
│   ├── tickers/                    # Pre-built ticker lists (committed, not gitignored)
│   │   ├── __init__.py             # Package exports: NSE_TICKERS, BSE_TICKERS, sub-lists
│   │   ├── nse_tickers.py          # NSE_TICKERS (500, .NS suffix) + NIFTY_50/BANK/IT/PHARMA/AUTO
│   │   ├── bse_tickers.py          # BSE_TICKERS (500, numeric .BO codes) + SENSEX_30 + NAME_MAP
│   │   └── build_csv.py            # CLI utility: generates CSV snapshots from ticker lists
│   ├── rag_eval_set.json           # RAG evaluation ground-truth dataset (committed)
│   ├── rag_eval.db                 # SQLite RAG evaluation results (gitignored, created at runtime)
│   ├── observability.db            # SQLite observability store (gitignored, created at runtime)
│   ├── raw/                        # Downloaded OHLCV CSVs / Parquet (gitignored)
│   └── processed/                  # Feature-engineered data (gitignored)
│
├── docs/                           # Documentation and knowledge base
│   └── faq.json                    # Static FAQ: 5 categories, 28+ entries (committed)
│
├── notebooks/                      # Jupyter notebooks for EDA (exploration only)
│
├── requirements.txt                # Pinned Python dependencies
├── .env                            # Local secrets (gitignored) — loaded via python-dotenv
├── .gitignore
└── README.md
```

## Conventions

### Python backend
- All business logic lives in `src/` as importable modules — never in notebooks or a top-level script
- `src/api/models.py` owns all shared data models (Pydantic classes and dataclasses); no model definitions elsewhere
- `src/api/cache.py` is the only place session state is stored; routes import from it
- Route handlers in `src/api/routes/` are thin orchestrators — they call data/features/models modules, not implement logic directly
- `src/rag/` owns the entire RAG pipeline — each module is a single responsibility (ingest, retrieve, generate, evaluate, store, orchestrate)
- Module naming: `snake_case` for all files and directories
- Data pipeline scripts prefixed with stage: `fetch_`, `clean_`, `feature_`, `train_`, `evaluate_`
- Environment variables loaded via `python-dotenv` from `.env` at project root

### Testing (Python)
- Test files mirror `src/` structure: `tests/test_fetch.py` for `src/data/fetch_market_data.py`
- Every public function must have at least one unit test before it is considered complete
- Property-based tests (`hypothesis`) cover mathematical invariants (scoring bounds, indicator ranges)
- Integration tests use `httpx.AsyncClient` with `ASGITransport` — no live network calls in CI
- **Gate rule**: all tests in a module's test file must be GREEN before implementation moves to the next module
- MVP4 RAG tests use mocked Pinecone/OpenAI clients — no live API calls in CI

### Frontend
- `frontend/src/api/` — API client only; no UI code
- `frontend/src/pages/` — page-level components (route views); one file per page
- `frontend/src/components/` — reusable components; co-located `*.test.jsx` file required
- Cloudscape components are imported from `@cloudscape-design/components`; global styles imported once in `App.jsx`
- Font: **DM Sans** (Google Fonts, imported in theme.css) — custom teal palette
- Results table: `stripedRows`, gradient score pills, color-coded sub-score badges
- `data-testid` attributes are required on all interactive and key display elements for Playwright selectors
- `frontend/e2e/` — Playwright tests only; no unit test code here

### Playwright E2E
- One spec file per feature area (input form, results table, detail drawer, full-stack)
- API responses are mocked via `page.route()` in isolation tests; `full-stack.spec.js` uses the live backend
- `playwright.config.js` sets `baseURL: "http://localhost:5173"` and defines `webServer` entries to auto-start both servers
- **Gate rule**: Playwright suites must be GREEN before the frontend feature is marked complete

### Data and artifacts
- `data/tickers/` — **committed** to the repo; contains curated NSE and BSE ticker lists used as input to the application
- `data/rag_eval_set.json` — **committed**; ground-truth evaluation dataset for RAG pipeline
- `data/rag_eval.db` — **gitignored**; created at runtime by the RAG evaluator
- `data/raw/` and `data/processed/` — never commit; document the fetch process in notebooks
- Model artifacts (`.pkl`, `.h5`, `.pt`) — never commit; store locally and gitignore
- Configuration (ticker lists, hyperparameters) — externalise to YAML/JSON or environment variables; never hardcode

### Configuration (`config/`)
- `config/rag_pipeline.yaml` — **committed**; defines RSS feed sources, chunking parameters, embedding model, ingestion schedule, and circuit breaker thresholds
- Future configs (data_sources.yaml for MVP1a) will also live in `config/`

### Ticker lists (`data/tickers/`)
- `nse_tickers.py` exports `NSE_TICKERS` (~500 symbols, `.NS` suffix) and sector sub-lists: `NIFTY_50`, `NIFTY_BANK`, `NIFTY_IT`, `NIFTY_PHARMA`, `NIFTY_AUTO`
- `bse_tickers.py` exports `BSE_TICKERS` (~500 symbols, numeric `.BO` codes), `SENSEX_30`, `NAME_MAP` dict (scrip code → company name), and `get_ticker_name(scrip_code)` helper
- `data/tickers/__init__.py` re-exports everything — always import via `from data.tickers import NSE_TICKERS` rather than the sub-module directly
- Both files include a `if __name__ == "__main__":` block for quick sanity-check counts; run with `python -m data.tickers.nse_tickers` or `python -m data.tickers.bse_tickers`
- NSE uses symbol-based tickers (e.g. `RELIANCE.NS`); BSE uses numeric scrip codes (e.g. `500325.BO`) — never mix the two formats in the same list
- `build_csv.py` is a standalone CLI utility that writes CSV snapshots of all ticker lists to `data/tickers/`; run with `python -m data.tickers.build_csv` from the project root. It produces: `nse_tickers.csv`, `bse_tickers.csv`, `nse_nifty50.csv`, `nse_nifty_bank.csv`, `nse_nifty_it.csv`, `nse_nifty_pharma.csv`, `nse_nifty_auto.csv`, `bse_sensex30.csv`. The generated CSVs are co-located in `data/tickers/` and may be committed if needed for tooling that prefers flat files over Python imports.

### Environment variables
- `.env` at project root — never commit; loaded via `python-dotenv`
- `FRONTEND_ORIGIN` — CORS allowed origin for the backend (default: `http://localhost:5173`)
- `VITE_API_URL` — backend URL used by the frontend (default: `http://localhost:8000`)
- `ALPHA_VANTAGE_API_KEY` — Alpha Vantage GLOBAL_QUOTE for Intraday tab (free tier, 25 calls/day)
- `PINECONE_API_KEY` — Pinecone vector DB API key (MVP4)
- `OPENAI_API_KEY` — OpenAI embeddings + generation (MVP4)
- `OPENAI_EMBEDDING_MODEL` — Embedding model (default: `text-embedding-3-small`)
- `OPENAI_CHAT_MODEL` — LLM for generation (default: `gpt-4o-mini`)
- Use `python-dotenv` to load `.env` in Python; Vite reads `.env` automatically
