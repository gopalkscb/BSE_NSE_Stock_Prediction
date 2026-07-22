# MVP1a Requirements Document — Live/Near-Real-Time Multi-Source Data Polling

## Introduction

MVP1a extends MVP1 with live/near-real-time market data from multiple configurable sources (yfinance, BSE India, NSE India, Alpha Vantage), a provider management interface, and a comprehensive token & API consumption dashboard. The system introduces a pluggable DataProvider architecture with priority-based fallback, 60-second polling during market hours, and budget-aware rate limiting to keep the application within free-tier limits.

**Deployment target:** Local dev (same as MVP1).
**Prerequisite:** MVP1 Tasks 1–15 complete and all MVP1 tests GREEN.

---

## Glossary

- **DataProvider**: An abstract interface that any data source adapter (yfinance, BSE India, NSE India, Alpha Vantage) must implement, exposing `fetch_ohlcv`, `get_live_price`, `health_check`, and `provider_name` methods.
- **Provider Manager**: The orchestrator that maintains the priority-ordered list of enabled DataProviders, performs health monitoring, handles failover, and routes data requests to the highest-priority healthy provider.
- **Priority Fallback**: A chain-of-responsibility pattern where, if the primary provider fails, the system automatically tries the next enabled provider in priority order until one succeeds or all are exhausted.
- **Rate Limiter**: A per-provider mechanism that enforces maximum API calls per time window (e.g., NSE: 5/min, BSE: 10/min) using token-bucket or sliding-window counters.
- **Budget Check**: A pre-flight validation step (FastAPI dependency) that verifies remaining daily/monthly quota before making an external API call; if exhausted, the call is skipped and the ticker is marked as `"budget_exhausted"`.
- **Circuit Breaker**: A pattern that auto-disables a provider after consecutive failures (default: 3) and pauses requests to it for a cooldown period before retrying.

---

## Requirements

### Requirement MVP1a-R1 — Multi-Source Data Provider Interface

**User Story:** As a developer, I want a pluggable data source architecture so I can add new market data APIs without modifying core logic.

#### Acceptance Criteria

1. THE system SHALL define an abstract `DataProvider` interface with methods: `fetch_ohlcv(ticker, period) -> DataFrame`, `get_live_price(ticker) -> float`, `health_check() -> bool`, `provider_name() -> str`.
2. THE system SHALL ship with 4 provider adapters: `YFinanceProvider`, `BSEIndiaProvider`, `NSEIndiaProvider`, `AlphaVantageProvider`.
3. Provider configuration SHALL be stored in `config/data_sources.yaml` with fields: `name`, `enabled`, `priority` (1=highest), `api_key_env_var`, `rate_limit_per_min`, `timeout_seconds`.
4. THE API Server SHALL expose `POST /api/v1a/config/data-sources` to hot-reload the data sources config without server restart.
5. THE system SHALL implement a priority fallback chain: if the primary provider fails, it SHALL automatically try the next enabled provider in priority order.
6. Each provider SHALL have independent rate limiting respecting the source's free-tier limits (NSE: 5 req/min, BSE: 10 req/min, Alpha Vantage: 25 req/day, yfinance: 100 req/min).

---

### Requirement MVP1a-R2 — Live/Near-Real-Time Data Streaming

**User Story:** As a trader, I want to see near-real-time prices so my analysis reflects current market conditions.

#### Acceptance Criteria

1. THE system SHALL poll the active data source every 60 seconds during market hours (9:15 AM – 3:30 PM IST, Mon–Fri) for live price updates.
2. THE Frontend SHALL display a live price ticker banner showing the last-fetched price, timestamp, and source for watched tickers.
3. WHEN a new daily bar closes (3:30 PM IST), THE system SHALL auto-trigger a re-scoring of all watched tickers using the freshest data.
4. THE system SHALL cache live prices in-memory with a 60-second TTL to avoid redundant API calls.
5. IF the market is closed, THE system SHALL display the last available closing price with a "Market Closed" indicator.

---

### Requirement MVP1a-R3 — Admin Data Source Management

**User Story:** As an admin, I want to manage data sources from the UI without editing config files.

#### Acceptance Criteria

1. THE Frontend SHALL include a "Data Sources" tab showing all configured providers with status (healthy/unhealthy), priority, rate limit usage, and last successful fetch timestamp.
2. THE admin SHALL be able to enable/disable, reorder priority, and edit rate limits for each provider via the UI.
3. THE system SHALL monitor provider health via periodic health checks (every 5 minutes) and auto-disable providers that fail 3 consecutive checks.
4. THE system SHALL log provider failovers at WARNING level with the failed provider name and the fallback provider used.

---

### Requirement MVP1a-R4 — Frontend Source Toggle

**User Story:** As a trader, I want to choose which data source powers my analysis and see which source was used.

#### Acceptance Criteria

1. THE Frontend SHALL display a Cloudscape Select dropdown above the results table allowing the user to choose the active data source (or "Auto" for priority chain).
2. THE results table SHALL show a source badge per ticker indicating which provider supplied the data.
3. THE user SHALL be able to re-run analysis with a different source to compare results side-by-side.

---

### Requirement MVP1a-R5 — Token & API Consumption Dashboard

**User Story:** As an application user, I want to see current token consumption for LLMs and APIs, daily/monthly usage, and remaining free-tier limits for all third-party APIs, so that I am aware of usage costs and the application does not crash due to exceeded rate limits.

#### Acceptance Criteria

1. THE API Server SHALL track and persist the following consumption metrics in `data/observability.db`:
   - **OpenAI tokens**: input tokens consumed, output tokens consumed, total tokens, per-day and per-month aggregates, estimated USD cost.
   - **Pinecone operations**: read units, write units, delete operations, per-day and per-month aggregates.
   - **yfinance API calls**: total calls today, total calls this month, average response time.
   - **BSE India API calls**: total calls today, calls remaining (rate limit: 10/min), failures today.
   - **NSE India API calls**: total calls today, calls remaining (rate limit: 5/min), failures today.
   - **Alpha Vantage API calls**: total calls today, calls remaining (free tier: 25/day), failures today.
2. THE API Server SHALL expose `GET /api/v1a/observability/consumption` returning a JSON object with all tracked consumption metrics, including:
   - `openai`: `{tokens_today, tokens_this_month, cost_today_usd, cost_this_month_usd, limit_tokens_per_month, remaining_tokens}`
   - `pinecone`: `{reads_today, writes_today, reads_this_month, writes_this_month, free_tier_limit}`
   - `yfinance`: `{calls_today, calls_this_month, avg_response_ms, rate_limit_per_min, remaining_this_minute}`
   - `bse_india`: `{calls_today, calls_this_month, rate_limit_per_min, remaining_this_minute, failures_today}`
   - `nse_india`: `{calls_today, calls_this_month, rate_limit_per_min, remaining_this_minute, failures_today}`
   - `alpha_vantage`: `{calls_today, calls_this_month, daily_limit, remaining_today, failures_today}`
   - `last_reset_at`: ISO timestamp of last daily counter reset
3. THE API Server SHALL expose `GET /api/v1a/observability/consumption/history?days=30` returning daily aggregates for the last N days for trending.
4. THE API Server SHALL automatically reset daily counters at midnight IST (00:00 IST) and monthly counters on the 1st of each month.
5. THE API Server SHALL implement a **pre-flight budget check** before making any external API call: if the remaining daily/monthly budget for that provider is exhausted, the call SHALL be skipped and the ticker SHALL be marked as `"budget_exhausted"` in the failed list. The application SHALL NOT crash or throw unhandled exceptions due to rate limit exhaustion.
6. THE API Server SHALL emit a WARNING log when any provider reaches 80% of its daily limit, and an ERROR log when 100% is reached (circuit breaker activated).
7. THE Frontend SHALL render a "Usage & Limits" panel within the Observability tab containing:
   - **Summary cards row** (Cloudscape ColumnLayout): Total API calls today, OpenAI tokens today, estimated cost today (USD), providers at risk (count where usage > 80%).
   - **Provider usage table** (Cloudscape Table): one row per provider showing: Provider Name, Calls Today, Daily Limit, Usage % (ProgressBar), Remaining, Status Badge (green <60%, amber 60–80%, red >80%).
   - **OpenAI token breakdown** (Cloudscape Container): input tokens vs. output tokens (Recharts PieChart), daily trend line (Recharts LineChart, last 7 days), monthly cumulative with projected end-of-month (Recharts AreaChart).
   - **Cost tracker** (Cloudscape Container): estimated cost today, cost this month, projected monthly cost (extrapolated from daily average), budget alert threshold (configurable via `API_MONTHLY_BUDGET_USD` env var, default `10.0`).
   - **Rate limit status** (live): per-provider remaining calls this minute, auto-refreshes every 10 seconds.
8. THE Frontend "Usage & Limits" panel SHALL display a Cloudscape `Alert type="warning"` banner when ANY provider exceeds 80% of its daily limit, showing: "{Provider} has used {X}% of its daily limit ({used}/{total}). Requests may be throttled."
9. THE Frontend "Usage & Limits" panel SHALL display a Cloudscape `Alert type="error"` banner when ANY provider is at 100% (circuit breaker active), showing: "{Provider} daily limit reached. Requests to this source are paused until {next_reset_time}."
10. THE Frontend "Usage & Limits" panel SHALL auto-poll every 30 seconds and provide a manual "Refresh" button.
11. THE following environment variables SHALL control budget thresholds:
    - `API_MONTHLY_BUDGET_USD` (default `10.0`) — monthly cost alert threshold
    - `OPENAI_MONTHLY_TOKEN_LIMIT` (default `1000000`) — monthly OpenAI token hard limit
    - `ALPHA_VANTAGE_DAILY_LIMIT` (default `25`) — Alpha Vantage free tier daily limit
    - `YFINANCE_RATE_LIMIT_PER_MIN` (default `100`) — yfinance rate limit
    - `BSE_RATE_LIMIT_PER_MIN` (default `10`) — BSE India rate limit
    - `NSE_RATE_LIMIT_PER_MIN` (default `5`) — NSE India rate limit
12. THE consumption tracking middleware SHALL increment counters atomically (thread-safe via SQLite WAL mode) and SHALL NOT add more than 2ms latency per request.
13. THE pre-flight budget check SHALL be implemented as a FastAPI dependency that runs before any route handler making external API calls. If budget is exhausted, it SHALL return a structured response indicating which provider is paused and when it resets, rather than crashing.
