# MVP2 Requirements Document — Deep-Dive Algorithmic Analysis Engine

## Introduction

MVP2 extends the MVP1 Bullish Stock Predictor with 6 additional technical indicators (11 total), configurable weighted scoring, historical backtesting, portfolio simulation, scheduled alerts, enhanced charts, persistent caching, rate limiting, full OWASP Web Top 10 and OWASP LLM Top 10 security guardrails, and a comprehensive observability and security compliance dashboard.

**Deployment target:** Internal network / cloud (not local-only).
**API versioning:** New endpoints at `/api/v2/`; all `/api/v1/` endpoints remain fully backward compatible.

---

## Glossary Additions (extends MVP1 glossary)

- **Enhanced Score**: The weighted composite score (0–100) computed from all 11 indicators with configurable weights.
- **Stochastic Oscillator**: A momentum indicator comparing closing price to the price range over a lookback period.
- **MFI (Money Flow Index)**: A volume-weighted RSI that incorporates both price and volume data.
- **ADX (Average Directional Index)**: Measures trend strength regardless of direction.
- **DMI (Directional Movement Index)**: +DI and -DI lines indicating bullish vs bearish directional movement.
- **Supertrend**: A trend-following overlay indicator based on ATR (Average True Range).
- **OBV (On-Balance Volume)**: Cumulative volume indicator where volume is added on up-days and subtracted on down-days.
- **VWAP (Volume Weighted Average Price)**: The average price weighted by volume, indicating fair value.
- **Backtest**: Re-running the scoring model on historical windows to measure predictive accuracy.
- **Win Rate**: Percentage of High-confidence signals that produced a positive return within the forecast window.
- **Sharpe Ratio**: Risk-adjusted return metric (excess return / standard deviation of returns).
- **Rate Limiting**: Restricting the number of API requests per time window per client IP.
- **OWASP**: Open Worldwide Application Security Project — a nonprofit producing security guidelines.

---

## Requirements

### Requirement 1 — Extended Indicator Library (11 Indicators)

**User Story:** As a trader, I want more technical indicators analysed so that the bullish signal is derived from a broader set of market data.

#### Acceptance Criteria

1. THE Indicator Calculator SHALL compute the Stochastic Oscillator using a 14-period lookback, 3-period %K smoothing, and 3-period %D smoothing. Output: %K and %D values in [0, 100].
2. THE Indicator Calculator SHALL compute the Money Flow Index (MFI) using a 14-period lookback. Output: MFI value in [0, 100].
3. THE Indicator Calculator SHALL compute the Average Directional Index (ADX) and Directional Movement Index (+DI, -DI) using a 14-period lookback. Output: ADX value in [0, 100], +DI and -DI values.
4. THE Indicator Calculator SHALL compute the Supertrend indicator using a 10-period ATR and multiplier of 3. Output: Supertrend line value and direction (up/down).
5. THE Indicator Calculator SHALL compute On-Balance Volume (OBV) as a cumulative sum. Output: OBV value and its 10-day slope (positive/flat/negative).
6. THE Indicator Calculator SHALL compute VWAP (Volume Weighted Average Price) for the current trading session. Output: VWAP value.
7. THE new indicator library SHALL use `pandas-ta==0.3.14b` (pinned exact version) for computation.
8. ALL computed indicator values SHALL be finite (no NaN, no Inf). Non-finite values cause the ticker to be excluded from scoring.

---

### Requirement 2 — Configurable Weighted Scoring

**User Story:** As a trader, I want to adjust each indicator's weight so the score reflects my own trading style.

#### Acceptance Criteria

1. THE Prediction Engine SHALL compute the Enhanced Score as: `score = (Sum(weight_i * subscore_i) / Sum(weight_i * 20)) * 100`, always resulting in an integer in [0, 100].
2. Default weights SHALL be loaded from `config/indicator_weights.yaml` at startup. All 11 indicators default to weight `1.0`.
3. THE API Server SHALL expose `POST /api/v2/config/weights` (API key required) accepting `{indicator_name: weight}`. Each weight must be >= 0.0 and <= 5.0. At least one weight must be > 0.
4. Updated weights SHALL be stored in the server session and applied to subsequent scoring until restart or reset.
5. THE Frontend SHALL render a Settings Modal with a slider (0.0–5.0) per indicator and a Reset to Defaults button. Weights persist in `localStorage`.
6. THE Enhanced Score SHALL always remain in [0, 100] regardless of weight configuration.

---

### Requirement 3 — Historical Backtesting Engine

**User Story:** As a trader, I want to see how well the scoring model performed historically so I can trust it.

#### Acceptance Criteria

1. THE API Server SHALL expose `POST /api/v2/backtest` (API key required) accepting `{tickers, start_date, end_date, weights}`. It SHALL return `{job_id, status: "pending"}` immediately.
2. THE backtesting engine SHALL re-run the scoring model on rolling 30-day windows and compute per ticker: win rate, average return per confidence tier, and max drawdown.
3. `GET /api/v2/backtest/{job_id}` SHALL return job status (`pending`/`running`/`complete`/`failed`) and results when complete.
4. THE Frontend SHALL render backtest results in a Cloudscape ExpandableSection per ticker with a Recharts BarChart showing return distribution.
5. IF fewer than 6 months of data are available, that ticker SHALL be excluded with reason `"insufficient_history"`.

---

### Requirement 4 — Portfolio Simulation

**User Story:** As a trader, I want to simulate a paper portfolio from the top-10 results to see combined historical performance.

#### Acceptance Criteria

1. THE API Server SHALL expose `POST /api/v2/portfolio/simulate` accepting a list of tickers with optional custom allocation weights (default: equal weight).
2. THE simulation SHALL compute over the last 1 year: cumulative return, annualised Sharpe ratio (risk-free rate = 6% for INR), and maximum drawdown.
3. THE Frontend SHALL render a Portfolio tab with a Recharts AreaChart for cumulative P&L and a summary stats table.

---

### Requirement 5 — Watchlist & Scheduled Alerts

**User Story:** As a trader, I want to be alerted when a watched stock's score crosses my threshold.

#### Acceptance Criteria

1. THE Frontend SHALL persist a user watchlist in browser `localStorage`.
2. THE Frontend SHALL support configurable polling intervals (15min / 30min / 1hr) to re-run analysis on the watchlist.
3. THE Frontend SHALL trigger Web Notifications API browser push when a ticker's Enhanced Score crosses a user-defined threshold.
4. Alert history SHALL be shown in a Cloudscape Flashbar notification stack.

---

### Requirement 6 — Enhanced Interactive Charts

**User Story:** As a trader, I want full interactive candlestick charts with overlay toggles so I can visually confirm signals.

#### Acceptance Criteria

1. THE Frontend SHALL render a candlestick chart (OHLC bars) via Recharts ComposedChart replacing the MVP1 line chart.
2. THE Frontend SHALL provide toggle buttons for overlays: SMA-50, SMA-200, EMA-20, Bollinger Bands, Supertrend line, Volume bars.
3. THE Frontend SHALL support zoom/pan via Recharts brush control.
4. THE Frontend SHALL support chart export as PNG via `html-to-image` library.

---

### Requirement 7 — Sector & Index Comparison

**User Story:** As a trader, I want to compare a stock's score against its sector index.

#### Acceptance Criteria

1. THE API Server SHALL compute a relative strength score for each ticker vs. its Nifty sector index (IT, Bank, Pharma, Auto).
2. THE Frontend SHALL display the relative strength alongside the absolute Enhanced Score.
3. THE Frontend SHALL provide a sector filter dropdown in the results table.

---

### Requirement 8 — Persistent Cache (SQLite)

**User Story:** As an operator, I want scored results to survive server restarts.

#### Acceptance Criteria

1. THE API Server SHALL replace the in-memory dict cache with SQLite via `aiosqlite`.
2. Cache TTL SHALL be 4 hours per ticker result. Stale entries SHALL NOT be served.
3. `GET /api/v2/cache/status` (API key required) SHALL return cached ticker count and oldest entry age.
4. `data/cache.db` SHALL be gitignored.

---

### Requirement 9 — API Versioning & Rate Limiting

**User Story:** As an operator, I want to prevent abuse and maintain backward compatibility.

#### Acceptance Criteria

1. MVP2 endpoints SHALL be mounted at `/api/v2/`. All `/api/v1/` endpoints SHALL remain unchanged.
2. `slowapi` rate limiting SHALL enforce: max 10 analysis requests/min per IP, max 2 backtest requests/min per IP. Exceeding returns HTTP 429 with `Retry-After` header.
3. Request/response logging middleware SHALL be added to `main.py`.
4. Request body size cap of 64KB SHALL be enforced via middleware. Exceeding returns HTTP 413.

---

### Requirement 10 — OWASP Web Top 10 (2021) Guardrails

**User Story:** As a security engineer, I want all OWASP Web Top 10 risks mitigated so the application is hardened for internal/cloud deployment.

#### Acceptance Criteria

1. **A01 Broken Access Control**: All admin endpoints SHALL enforce `X-API-Key` header check. Missing/wrong key returns HTTP 401. Key loaded from `ADMIN_API_KEY` env var only.
2. **A02 Cryptographic Failures**: `ADMIN_API_KEY` SHALL be >= 32 chars (rejected at startup otherwise). `Strict-Transport-Security` header added in production mode.
3. **A03 Injection**: Every ticker SHALL be validated against regex `^[A-Z0-9]{1,10}(\.(NS|BO))?$`. SQLite uses parameterised queries only. No `dangerouslySetInnerHTML` in frontend.
4. **A04 Insecure Design**: Rate limiting, 64KB body cap, 200-ticker batch limit at Pydantic layer, 90s batch timeout.
5. **A05 Security Misconfiguration**: No CORS wildcard; Swagger disabled in production; generic error messages in 500 responses; 5 security headers on all responses.
6. **A06 Vulnerable Components**: `pip-audit --fail-on HIGH` and `npm audit --audit-level=high` exit 0 before release. All deps pinned with hashes.
7. **A07 Auth Failures**: API key redacted in logs; constant-time comparison via `hmac.compare_digest`; rate limiter on admin endpoints.
8. **A08 Data Integrity**: Hash-verified pip installs; yfinance data validated (columns present, finite values, >50% single-bar moves flagged suspicious); Pydantic Literal types for labels.
9. **A09 Logging Failures**: structlog JSON for all requests; 401/422/429 logged at WARNING; security events endpoint returns last 100 events.
10. **A10 SSRF**: Ticker allowlist regex prevents URL/IP-like strings; 30s per-ticker timeout; deployment guide documents egress firewall rules.

---

### Requirement 11 — OWASP LLM Top 10 (2025) Proactive Guardrails

**User Story:** As a security engineer, I want proactive LLM security guardrails in place so the application is ready for future AI features without retrofit.

#### Acceptance Criteria

1. **LLM01 Prompt Injection**: No LLM client imports in `src/data/`, `src/features/`, `src/models/`. Verified by test.
2. **LLM02 Sensitive Info Disclosure**: API responses contain only requested tickers. No raw OHLCV in error logs. Config weights endpoint returns values only, not formulas.
3. **LLM03 Supply Chain**: All deps hash-verified. `pandas-ta` pinned exact. Admin dashboard shows non-PyPI deps.
4. **LLM04 Data Poisoning**: yfinance data validated for plausibility (>50% single-bar flagged, negative volume rejected). Indicator values range-checked.
5. **LLM05 Improper Output Handling**: Frontend uses Cloudscape props only (textContent). Signal labels are Pydantic Literal types. No dangerouslySetInnerHTML.
6. **LLM06 Excessive Agency**: DataFetcher calls only yfinance domain. App writes only to `data/cache.db` and `logs/`. ThreadPoolExecutor bounded at 10.
7. **LLM07 System Prompt Leakage**: OpenAPI schema contains no internal paths or formulas. Config weights returns values only.
8. **LLM08 Vector/Embedding Weaknesses**: Cache uses exact-match lookups only. No fuzzy matching on tickers.
9. **LLM09 Misinformation**: Every analyze response includes `disclaimer` field. Frontend shows permanent info Alert. `data_as_of` timestamp in every response. Confidence tooltips explain meaning.
10. **LLM10 Unbounded Consumption**: 200-ticker limit at Pydantic layer. Rate limiting. Batch timeout. Body size cap. Active-requests gauge with load shedding at 5 concurrent.

---

### Requirement 12 — Observability Module

**User Story:** As an operator, I want comprehensive metrics, logging, and health endpoints for production monitoring.

#### Acceptance Criteria

1. `prometheus-fastapi-instrumentator` SHALL expose `GET /metrics` (API key required) with: `http_requests_total`, `http_request_duration_seconds`, `active_analysis_requests` gauge, `yfinance_fetch_duration_seconds`, `scoring_pipeline_duration_seconds`, `cache_hits_total`, `cache_misses_total`, `security_events_total`.
2. `structlog` SHALL produce JSON logs with: `timestamp`, `request_id`, `level`, `method`, `path`, `status_code`, `duration_ms`, `client_ip`, `ticker_count`. API keys redacted to `[REDACTED]`.
3. `GET /health` (no auth) SHALL return `{"status": "ok", "uptime_seconds": N}`.
4. `GET /health/ready` (no auth) SHALL return 200 if cache + indicators ready, 503 otherwise.
5. `GET /api/v2/security/events` (API key) SHALL return last 100 security events (401/422/429) as JSON.
6. Log files SHALL be written to `logs/app.log`, rotated daily, 7 days retained. `logs/` gitignored.

---

### Requirement 13 — Security Compliance Dashboard

**User Story:** As an operator, I want a real-time dashboard showing system health, request metrics, and OWASP compliance status.

#### Acceptance Criteria

1. THE Frontend SHALL render a public status banner (Cloudscape Flashbar) at the top of AnalysisPage: green (API Online), amber (Degraded), red (Offline). Polls `/health` every 30s.
2. THE Frontend SHALL render a permanent Cloudscape Alert (type info) with the misinformation disclaimer.
3. THE Frontend SHALL expose a protected `/admin` route gated by API key entry (stored in sessionStorage).
4. THE admin dashboard SHALL have 5 Cloudscape Tabs: System Health, Request Metrics, Security Status (15-point OWASP checklist), Cache Status, Dependency Versions.
5. THE Security Status tab SHALL show pass/fail for: pip-audit, npm-audit, CORS config, 5 security headers, admin key entropy, Swagger disabled (prod), disclaimer present, data_as_of present, rate limiting active, body cap active, OHLCV validation active, hash-verified deps. Overall score X/15.
6. All admin dashboard data SHALL auto-refresh every 60 seconds.
