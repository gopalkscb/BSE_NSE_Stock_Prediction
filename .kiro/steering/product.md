# Product Overview

The Bullish Stock Predictor is a full-stack application for Indian equity markets (BSE and NSE). Given a user-supplied list of stock tickers, it fetches historical price data, computes five standard technical indicators, and ranks the **most bullish stocks** for the next 30-day outlook using a rule-based composite scoring model.

## Core Purpose

- Accept a list of BSE/NSE tickers (NSE: `.NS` suffix, BSE: `.BO` suffix via yfinance)
- Fetch 1 year of daily OHLCV data per ticker using **yfinance**
- Compute RSI, MACD, Bollinger Bands, Moving Averages (SMA/EMA), and Volume Trend
- Assign each ticker a **Bullish Score (0–100)** from five equal-weight sub-scores (0–20 each)
- Derive a **Confidence Level** (High / Medium / Low) and a **30-day Projected Price Range**
- Return all ranked tickers (sorted by score) via a **FastAPI** REST backend with **Swagger UI** at `/docs`
- Render results in a **React + AWS Cloudscape Design System** frontend (professional, Amazon-style UI; paginated at 10 per page)

## Key Features

- **5-tab UI**: Analysis (bulk scoring), Intraday (single ticker lookup), RAG Reference (AI Q&A + evaluation), Observability, FAQ
- **Top-ranked results table**: Ticker, Bullish Score (gradient pill), Confidence Badge, RSI/MACD/BB/MA/Volume sub-score badges, 30-day price range (paginated at 10 per page, Cloudscape stripedRows)
- **Intraday tab**: Single ticker lookup using Alpha Vantage GLOBAL_QUOTE (free, 25 calls/day) + yfinance intraday bars (5m intervals). Shows intraday RSI, MACD, VWAP, trend, score, and price chart. No 30-day projection.
- **RAG Reference tab**: Conversational AI Q&A grounded in financial news (Pinecone + OpenAI hybrid retrieval) + RAG evaluation metrics dashboard
- **Per-stock detail drawer**: Full indicator breakdown with sub-scores, signal explanations, and a 90-day price chart (Recharts line chart with SMA-50 and SMA-200 overlays)
- **ETF presets**: GOLDBEES.NS, SILVERBEES.NS, NIFTYBEES.NS + 7 others available in ticker input dropdown
- **Swagger UI** (`/docs`) and **ReDoc** (`/redoc`) for interactive API exploration
- **In-memory session cache** — scored tickers are cached per server session for instant detail lookups
- **Partial failure handling** — if some tickers fail to fetch, successful ones are still ranked and returned
- **Global page footer** — shows API data source per tab
- **Font**: DM Sans (Google Fonts, imported in theme.css)

## Scoring Model (rule-based, no ML)

Each indicator contributes a sub-score of 0–20. Five sub-scores sum to a Bullish Score of 0–100:

| Indicator | Top signal → 20pts | Partial signal → 10–15pts | No signal → 0pts |
|---|---|---|---|
| RSI (14) | RSI < 30 (oversold) | RSI 30–50 → 15, RSI 50–70 → 10 | RSI > 70 (overbought) |
| MACD (12/26/9) | Above signal + rising histogram | Above signal only → 12 | Below signal |
| Bollinger Bands (20/2σ) | Close below lower band | Lower-to-midline → 12, midline-to-upper → 6 | Above upper band |
| Moving Averages | Golden Cross (SMA50 > SMA200) | Close above SMA50 → 10 | Below SMA50 |
| Volume Trend | 5d avg > 20d avg by >20% | Within 20% → 10 | >20% below 20d avg |

Confidence: **High** (75–100) · **Medium** (50–74) · **Low** (0–49)

## Target Users

Traders, analysts, and data scientists interested in a fast, rules-based bullish signal screener for Indian equity markets.

## Ticker Reference Lists

Pre-built, curated ticker lists live in `data/tickers/` and are committed to the repository:

| Export | Exchange | Format | Count |
|---|---|---|---|
| `NSE_TICKERS` | NSE | `<SYMBOL>.NS` | ~500 (Nifty 500 + liquid mid/small-cap) |
| `NIFTY_50` | NSE | `<SYMBOL>.NS` | 50 |
| `NIFTY_BANK` / `NIFTY_IT` / `NIFTY_PHARMA` / `NIFTY_AUTO` | NSE | `<SYMBOL>.NS` | 10–20 each |
| `BSE_TICKERS` | BSE | `<SCRIP_CODE>.BO` | ~500 (BSE 500 + liquid mid/small-cap) |
| `SENSEX_30` | BSE | `<SCRIP_CODE>.BO` | 30 |
| ETF presets | NSE | `<SYMBOL>.NS` | 10 (GOLDBEES, SILVERBEES, NIFTYBEES, etc.) |

Import via `from data.tickers import NSE_TICKERS, NIFTY_50, BSE_TICKERS` etc.

## Constraints and Scope

- MVP uses **rule-based scoring only** — no ML model training in this iteration
- Data sources: **yfinance** (primary for daily OHLCV and intraday bars) + **Alpha Vantage** (optional, GLOBAL_QUOTE for Intraday tab, free tier 25 calls/day)
- Backend cache is **in-memory** — no database or persistent storage
- Maximum **500 tickers** per analysis request
- Minimum **50 trading days** of data required per ticker; tickers with less are excluded
