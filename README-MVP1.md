# MVP1 — Bullish Stock Screener

> Rules-based web screener: 5 indicators, all results ranked by bullish score (paginated at 10/page), React + Cloudscape UI with custom teal theme

## Status: ✅ Deployed (~85%)

Backend and frontend fully functional. 28 Python tests passing. Custom green-blue teal theme with DM Sans font. Playwright E2E tests written (119 tests across 15 files). Remaining ~15% is polish and minor fixes.

## Spec Files
- [Requirements](.kiro/specs/mvp1-bullish-screener/requirements.md)
- [Design](.kiro/specs/mvp1-bullish-screener/design.md)
- [Tasks](.kiro/specs/mvp1-bullish-screener/tasks.md)

---

## What It Does

- Accepts comma-separated BSE/NSE tickers (`.NS` / `.BO` suffix, max 500)
- Fetches 1 year daily OHLCV via yfinance
- Computes 5 indicators: RSI(14), MACD(12/26/9), Bollinger Bands(20/2σ), SMA-50/SMA-200, Volume Trend 5d/20d
- Assigns Bullish Score (0–100) with Confidence Level (High/Medium/Low)
- BSE ticker auto-resolution: attempts symbol → scrip code (`.BO` suffix) fallback if primary fetch fails
- Returns **all** ranked results with 30-day projected price range (frontend paginates at 10/page)
- Provides per-stock detail drawer with 90-day price chart (SMA overlays)
- **Intraday tab** (renamed from "Live Data"): single ticker lookup using Alpha Vantage GLOBAL_QUOTE (free) + yfinance intraday bars (5m intervals). Shows intraday RSI, MACD, VWAP, trend, score, and price chart. No 30-day projection.
- **ETF presets**: GOLDBEES.NS, SILVERBEES.NS, NIFTYBEES.NS + 7 others available in the ticker input dropdown
- Observability tab: Live Metrics panel (clickable cards drill down into filtered paginated detail), Error Log panel, FAQ/Debug Guide panel (5 categories)
- Observability monthly scope with auto-reset
- SQLite-backed observability store for metrics, errors, and ticker health
- Global page footer showing API data source per tab

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.x, FastAPI, Uvicorn |
| Data | yfinance, pandas, numpy |
| Frontend | React 18, Vite, AWS Cloudscape Design System |
| Custom Theme | Green-blue teal palette, DM Sans font |
| Charts | Recharts |
| API Docs | Swagger UI (`/docs`), ReDoc (`/redoc`) |
| Python Tests | pytest, pytest-asyncio |
| E2E Tests | Playwright (119 tests, 15 spec files, 6 projects) |
| Linting | ruff (Python), ESLint (JS) |

---

## Quick Start

```bash
# Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.api.main:app --reload
# → http://localhost:8000 (Swagger: /docs)

# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/analyze` | Submit tickers, get all results ranked by bullish score |
| `GET` | `/api/v1/ticker/{ticker}` | Get full indicator detail for a scored ticker |
| `GET` | `/api/v1/intraday/{ticker}` | Intraday indicators via Alpha Vantage + yfinance |
| `GET` | `/api/v1/observability/metrics` | Live metrics (request counts, durations); supports `?name=` filter and `?offset=` pagination |
| `GET` | `/api/v1/observability/errors` | Error log (paginated) |
| `GET` | `/api/v1/observability/health` | Ticker health status |
| `GET` | `/api/v1/observability/faq` | FAQ/Debug Guide (5 categories) |
| `GET` | `/health` | Health check (always 200, no auth) |
| `GET` | `/docs` | Swagger UI |
| `GET` | `/redoc` | ReDoc API documentation |

---

## Running Tests

```bash
# Python (28 tests passing)
pytest tests/ -v
pytest tests/ --cov=src --cov-report=term-missing

# E2E (119 tests across 15 spec files, 6 Playwright projects)
cd frontend && npx playwright test
```

---

## Deployment

**Local development only.** No external network exposure, no auth required.

---

## Known Gaps (~15% remaining)

- `@timed` decorator defined in `src/observability/timing.py` but not applied to any functions
- `update_ticker_health()` defined in `src/observability/store.py` but never called from routes
- Cache metrics (hit/miss) not emitted — cache works but produces no observability data
- `structlog` listed in `requirements.txt` but standard `logging` module used throughout
- `fetch_batch()` is sequential — `ThreadPoolExecutor` concurrent fetching deferred to MVP1b

---

[← Back to Journey README](README.md)
