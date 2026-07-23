---
name: mvp1-bullish-screener
description: MVP1 rules-based web screener with 5 indicators, FastAPI backend, React+Cloudscape frontend, SQLite observability dashboard, and FAQ library. Use when implementing or modifying core scoring, data fetching, indicator calculation, the base frontend UI, or the observability tab.
---

# MVP1 — Bullish Stock Screener

## Spec Location
- Requirements: `.kiro/specs/mvp1-bullish-screener/requirements.md`
- Design: `.kiro/specs/mvp1-bullish-screener/design.md`
- Tasks: `.kiro/specs/mvp1-bullish-screener/tasks.md`

## Scope
- 5 indicators: RSI, MACD, Bollinger Bands, SMA/EMA Moving Averages, Volume Trend
- Composite Bullish Score (0–100), equal-weight sub-scores (5 × 20pts)
- FastAPI REST API (`/api/v1/analyze`, `/api/v1/ticker/{ticker}`, `/api/v1/intraday/{ticker}`, `/api/v1/observability/*`)
- React + Cloudscape frontend (AnalysisPage, TickerInputForm, StockDetailDrawer)
- **Intraday tab**: Alpha Vantage GLOBAL_QUOTE + yfinance intraday bars (5m); shows RSI, MACD, VWAP, trend, score, price chart
- **ETF presets**: GOLDBEES.NS, SILVERBEES.NS, NIFTYBEES.NS + 7 others in ticker input dropdown
- Observability tab: Live Metrics panel (clickable cards drill down into filtered paginated detail), Error Log panel, FAQ/Debug Guide panel
- Observability monthly scope with auto-reset; metrics endpoint supports `?name=` filter and `?offset=` pagination
- SQLite-backed observability store (`data/observability.db`) — metrics, errors, ticker health
- In-memory session cache for scored results
- Static FAQ knowledge base (`docs/faq.json` — 5 categories, 28+ entries)
- Global page footer showing API data source per tab
- Basic smoke tests only (1–3 per module); heavy testing deferred to MVP1b (in MVP3 scope)

## Key Commands
```bash
uvicorn src.api.main:app --reload        # Backend
cd frontend && npm run dev               # Frontend
pytest tests/ -v                         # Python smoke tests
```

## Build Time
~2–2.5 hours (9 tasks, lite gate rules)

---
---
name: mvp1a-live-polling
description: MVP1a live data polling from multiple sources (BSE/NSE/yfinance/Alpha Vantage), admin data source management, and token/API consumption dashboard. Use when implementing data providers, live polling, admin data source UI, or the usage & limits panel.
---

# MVP1a — Live Data Polling

## Spec Location
- Requirements: `.kiro/specs/mvp1a-live-polling/requirements.md`
- Design: `.kiro/specs/mvp1a-live-polling/design.md`
- Tasks: `.kiro/specs/mvp1a-live-polling/tasks.md`

## Scope
- Multi-source DataProvider interface (yfinance, BSE India, NSE India, Alpha Vantage)
- Live/near-real-time price polling during market hours (60s interval, 9:15–15:30 IST)
- Priority fallback chain with auto-failover (auto-disable after 3 consecutive failures)
- Admin data source management with health monitoring + hot-reload config
- Frontend data source selector with source badges
- Token & API consumption tracking + Usage & Limits dashboard panel
- Pre-flight budget checks (FastAPI dependency) — blocks calls when provider budget exhausted

## Key Files
- `src/data/providers/base.py` — DataProvider ABC + ProviderError
- `src/data/providers/provider_manager.py` — ProviderManager (fallback, health, rate-limit)
- `src/data/providers/live_poller.py` — APScheduler 60s poller
- `src/observability/consumption_tracker.py` — SQLite WAL consumption counters
- `src/api/dependencies/budget_check.py` — Pre-flight budget FastAPI dependency
- `config/data_sources.yaml` — Provider config (committed)

## New Endpoints
- `POST /api/v1a/config/data-sources` — hot-reload config
- `GET /api/v1a/config/data-sources/status` — provider status
- `GET /api/v1a/live-prices` — cached live prices + market status
- `GET /api/v1a/observability/consumption` — current consumption metrics
- `GET /api/v1a/observability/consumption/history?days=30` — daily aggregates

## New Dependencies
- `apscheduler==3.10.4` (background polling)
- `pyyaml==6.0.1` (config parsing)
- `aiohttp==3.9.5` (BSE/NSE India async HTTP)

## Key Commands
```bash
uvicorn src.api.main:app --reload        # Backend
cd frontend && npm run dev               # Frontend
pytest tests/ -v                         # Python tests
```

## Build Time
~4.2 hours (9 tasks, detailed estimate from tasks.md)

---
---
name: mvp1b-test-hardening
description: MVP1b test hardening sprint backfilling production-grade test coverage. Use when adding property-based tests, expanding unit test suites, writing integration or E2E tests, upgrading batch concurrency, or completing Swagger annotations.
---

# MVP1b — Test Hardening

## Spec Location
- Requirements: `.kiro/specs/mvp1b-test-hardening/requirements.md`
- Design: `.kiro/specs/mvp1b-test-hardening/design.md`
- Tasks: `.kiro/specs/mvp1b-test-hardening/tasks.md`

## Scope
- 9 property-based tests (hypothesis) covering mathematical invariants
- Full unit test expansion (~10 → ~80 tests)
- Backend integration tests (httpx + ASGITransport)
- Frontend unit tests (Vitest + React Testing Library)
- Playwright E2E (6 spec files, ~25 tests)
- ThreadPoolExecutor concurrent batch fetching
- Full Swagger annotations on all endpoints
- Gate: ALL GREEN before MVP3 mobile starts

## Key Commands
```bash
pytest tests/ -v                         # All Python tests
cd frontend && npx vitest run            # All JS tests
cd frontend && npx playwright test       # All E2E tests
```

---
---
name: mvp2-deep-analysis
description: MVP2 deep-dive algorithmic analysis with 11 indicators, configurable weights, backtesting, portfolio simulation, OWASP security, and observability dashboard. Use when implementing security middleware, extended indicators, admin dashboard, or observability features.
---

# MVP2 — Deep-Dive Algorithmic Analysis Engine

## Spec Location
- Requirements: `.kiro/specs/mvp2-deep-analysis/requirements.md`
- Design: `.kiro/specs/mvp2-deep-analysis/design.md`
- Tasks: `.kiro/specs/mvp2-deep-analysis/tasks.md`
- Security Reference: `.kiro/steering/security.md`

## Scope
- 6 new indicators: Stochastic, MFI, ADX/DMI, Supertrend, OBV, VWAP (11 total)
- Configurable weighted scoring via YAML + API
- Historical backtesting engine (async jobs)
- Portfolio simulation (Sharpe, drawdown)
- SQLite persistent cache (4hr TTL)
- Rate limiting (slowapi), security headers, API key auth
- OWASP Web Top 10 + LLM Top 10 guardrails
- Prometheus metrics + structlog + security events
- Admin dashboard (5 tabs, 15-point security checklist)
- API v2 routes (backward compatible with v1)

## Key Commands
```bash
pip-audit --requirement requirements.txt --fail-on HIGH
npm audit --audit-level=high
pytest tests/ -v                         # All tests (MVP1 + MVP2)
```

---
---
name: mvp3-mobile
description: MVP3 native mobile app for Android and iOS using React Native + Expo. Google Sign-In authentication (Gmail federation), 5-indicator screener, live data lookup, watchlist with MMKV offline cache. Use when implementing the mobile app, push notifications, or biometric auth.
---

# MVP3 — Native Mobile Application (Android & iOS)

## Status: 🟡 Built (needs Firebase setup for push notifications)

## Spec Location
- Requirements: `.kiro/specs/mvp3-mobile/requirements.md`
- Design: `.kiro/specs/mvp3-mobile/design.md`
- Tasks: `.kiro/specs/mvp3-mobile/tasks.md`
- Security Reference: `.kiro/steering/security.md`

## Scope
- React Native 0.74 + Expo SDK 51 (monorepo: packages/shared, web, mobile)
- Same 11-indicator Enhanced Score as MVP2
- Native push notifications (FCM/APNs + Celery/Redis backend)
- Offline-first: TanStack Query + MMKV
- Native candlestick charts (react-native-gifted-charts)
- Biometric-gated watchlist (expo-local-authentication)
- Certificate pinning + Secure Store + root detection
- Sentry crash reporting
- EAS Build + Fastlane release pipeline
- Detox E2E tests

## Key Commands
```bash
cd packages/mobile && npx expo start     # Dev
cd packages/mobile && npx detox test     # E2E
npm audit --audit-level=high             # Security gate
eas build --platform all                 # Production build
```



---
name: mvp4-live-rag
description: MVP4 Pinecone RAG pipeline with hybrid retrieval (OpenAI dense + BM25 sparse), AI-powered signal explanations, conversational Q&A, and RAG evaluation dashboard. Use when implementing RAG pipeline, Pinecone integration, or evaluation metrics.
---

# MVP4 — Live Data Streaming + RAG-Powered Intelligence

## Status: 🟡 ~95% Implemented

## Spec Location
- Requirements: `.kiro/specs/mvp4-live-rag/requirements.md`
- Design: `.kiro/specs/mvp4-live-rag/design.md`
- Tasks: `.kiro/specs/mvp4-live-rag/tasks.md`
- Security Reference: `.kiro/steering/security.md`

## Scope
- Depends on MVP1a for live data layer (operates independently for now)
- Pinecone vector store (serverless, delete-and-replace for cost control)
- RAG ingestion pipeline: RSS feeds → chunk → embed (OpenAI) → BM25 sparse → upsert
- Hybrid retrieval: dense (OpenAI) + sparse (BM25) + Reciprocal Rank Fusion
- AI signal explanations (GPT-4o-mini, grounded in retrieved news)
- Conversational ticker Q&A chat panel (AskAIPanel.jsx)
- RAG evaluation: precision@k, recall@k, MRR, faithfulness, relevance (proxy metrics)
- **Auto-seeded evaluation data**: 20 eval records + 400 per-query records on startup; replace-on-threshold pruning (keeps latest 50)
- **RAG Dashboard**: shows ALL metrics (precision, recall, MRR, faithfulness, answer_relevance, context_relevance, duration, cost/tokens) + per-query breakdown table
- RAG Performance tab disabled while Ask AI chat is loading
- Pipeline orchestration with APScheduler + circuit breaker
- `/api/v4/rag/evaluation/latest` returns 200 with zeros (never 404) when no data

## Key Files
- `src/rag/pinecone_client.py` — Pinecone CRUD
- `src/rag/ingest.py` — Full ingestion pipeline (RSS → chunk → embed → upsert)
- `src/rag/retriever.py` — HybridRetriever (dense + sparse + RRF)
- `src/rag/generator.py` — RAGGenerator (explanations + Q&A)
- `src/rag/evaluator.py` — Evaluation metrics
- `src/rag/eval_store.py` — SQLite evaluation storage
- `src/rag/seed_eval.py` — Auto-seed evaluation data on startup
- `src/rag/orchestrator.py` — APScheduler + circuit breaker
- `src/api/routes/rag.py` — All v4 API endpoints
- `config/rag_pipeline.yaml` — Pipeline configuration
- `data/rag_eval_set.json` — 50 labelled evaluation samples

## Key Commands
```bash
uvicorn src.api.main:app --reload                  # Backend (auto-loads .env)
pytest tests/ -v                                    # All tests (MVP1 + MVP4)
python -c "from dotenv import load_dotenv; load_dotenv(); from src.rag.ingest import ArticleIngester; print(ArticleIngester().run_pipeline())"  # Manual ingest
```

## Environment Variables Required
- `OPENAI_API_KEY` — OpenAI embeddings + generation
- `PINECONE_API_KEY` — Pinecone vector store
- `ADMIN_API_KEY` — Protected endpoints (≥32 chars)