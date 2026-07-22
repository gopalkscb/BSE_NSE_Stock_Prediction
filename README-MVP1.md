# MVP1 — Bullish Stock Screener

> Rules-based web screener: 5 indicators, top-10 ranking, React + Cloudscape UI

## Status: 🟡 In Progress

## Spec Files
- [Requirements](.kiro/specs/mvp1-bullish-screener/requirements.md)
- [Design](.kiro/specs/mvp1-bullish-screener/design.md)
- [Tasks](.kiro/specs/mvp1-bullish-screener/tasks.md)

---

## What It Does

- Accepts comma-separated BSE/NSE tickers (`.NS` / `.BO` suffix)
- Fetches 1 year daily OHLCV via yfinance
- Computes 5 indicators: RSI(14), MACD(12/26/9), Bollinger Bands(20/2σ), SMA-50/SMA-200, Volume Trend 5d/20d
- Assigns Bullish Score (0–100) with Confidence Level (High/Medium/Low)
- Returns top-10 ranked results with 30-day projected price range
- Provides per-stock detail drawer with 90-day price chart (SMA overlays)
- Basic observability: `GET /health` endpoint + `structlog` JSON request logging

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.x, FastAPI, Uvicorn |
| Data | yfinance, pandas, numpy |
| Frontend | React 18, Vite, AWS Cloudscape Design System |
| Charts | Recharts |
| API Docs | Swagger UI (`/docs`), ReDoc (`/redoc`) |
| Python Tests | pytest, hypothesis (property-based) |
| JS Tests | Vitest, React Testing Library |
| E2E Tests | Playwright |
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
| `POST` | `/api/v1/analyze` | Submit tickers, get top-10 bullish ranking |
| `GET` | `/api/v1/ticker/{ticker}` | Get full indicator detail for a scored ticker |
| `GET` | `/health` | Health check (always 200, no auth) |
| `GET` | `/docs` | Swagger UI |
| `GET` | `/redoc` | ReDoc API documentation |

---

## Running Tests

```bash
# Python
pytest tests/ -v
pytest tests/ --cov=src --cov-report=term-missing

# JavaScript
cd frontend && npx vitest run

# E2E (both servers must be running)
cd frontend && npx playwright test
```

---

## Deployment

**Local development only.** No external network exposure, no auth required.

---

[← Back to Journey README](README.md)
