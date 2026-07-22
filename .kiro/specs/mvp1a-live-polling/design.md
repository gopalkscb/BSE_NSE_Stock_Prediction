# Design Document — MVP1a Live/Near-Real-Time Multi-Source Data Polling

## Overview

MVP1a introduces a pluggable multi-source data architecture on top of the MVP1 foundation. The system defines an abstract `DataProvider` interface implemented by four adapters (yfinance, BSE India, NSE India, Alpha Vantage), orchestrated by a `ProviderManager` that handles priority fallback, health monitoring, and rate limiting. A 60-second polling loop during market hours provides near-real-time prices, and a comprehensive consumption dashboard tracks API usage, token spend, and budget thresholds across all providers.

---

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Browser (React SPA)                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │ LivePriceBanner  │  │DataSourceSelector│  │  AdminDataSourcesTab      │  │
│  │ (ticker strip)   │  │ (Select dropdown)│  │  (status/priority/health) │  │
│  └──────────────────┘  └──────────────────┘  └───────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                   UsageLimitsPanel                                       ││
│  │  Summary Cards | Provider Table | OpenAI Charts | Cost Tracker | Rate   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────│─────────────────────────────────────────┘
                                    │ HTTP/JSON (CORS)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend (src/api/)                              │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    ProviderManager                                      │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌────────────┐ ┌──────────────────┐  │ │
│  │  │  YFinance   │ │  BSE India  │ │ NSE India  │ │  Alpha Vantage   │  │ │
│  │  │  Provider   │ │  Provider   │ │ Provider   │ │  Provider        │  │ │
│  │  └──────┬──────┘ └──────┬──────┘ └─────┬──────┘ └────────┬─────────┘  │ │
│  │         └────────────────┴──────────────┴─────────────────┘            │ │
│  │                        DataProvider Interface (ABC)                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────────┐  │
│  │ Live Price Poller  │  │ Consumption Tracker │  │  Budget Pre-flight   │  │
│  │ (APScheduler 60s)  │  │ (SQLite WAL)       │  │  (FastAPI Depends)   │  │
│  └────────────────────┘  └────────────────────┘  └──────────────────────┘  │
│                                                                             │
│  Routes:                                                                    │
│  POST /api/v1a/config/data-sources      (hot reload)                        │
│  GET  /api/v1a/observability/consumption                                    │
│  GET  /api/v1a/observability/consumption/history?days=30                     │
│  GET  /api/v1a/live-prices              (current cached prices)             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
         yfinance API        BSE India API         NSE India API
                                                         │
                                                         ▼
                                                  Alpha Vantage API
```

---

## DataProvider Interface

```python
# src/data/providers/base.py
from abc import ABC, abstractmethod
from typing import Optional
import pandas as pd


class DataProvider(ABC):
    """Abstract base class for all market data providers."""

    @abstractmethod
    def fetch_ohlcv(self, ticker: str, period: str = "1y") -> pd.DataFrame:
        """Fetch OHLCV data for a ticker over the given period.
        
        Returns a DataFrame with columns: Open, High, Low, Close, Volume.
        Raises ProviderError on failure.
        """
        ...

    @abstractmethod
    def get_live_price(self, ticker: str) -> float:
        """Get the latest live/delayed price for a ticker.
        
        Returns the current price as a float.
        Raises ProviderError if unavailable.
        """
        ...

    @abstractmethod
    def health_check(self) -> bool:
        """Check whether this provider is reachable and operational.
        
        Returns True if healthy, False otherwise.
        """
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable name of this provider (e.g., 'yfinance', 'BSE India')."""
        ...


class ProviderError(Exception):
    """Raised when a data provider fails to fulfill a request."""

    def __init__(self, provider: str, message: str, retryable: bool = True):
        self.provider = provider
        self.message = message
        self.retryable = retryable
        super().__init__(f"[{provider}] {message}")
```

---

## Provider Manager Class Outline

```python
# src/data/providers/provider_manager.py
from typing import List, Optional, Dict
import logging

from src.data.providers.base import DataProvider, ProviderError

logger = logging.getLogger(__name__)


class ProviderManager:
    """Orchestrates multiple DataProviders with priority fallback and health monitoring."""

    def __init__(self, config_path: str = "config/data_sources.yaml"):
        self._providers: List[DataProvider] = []
        self._health_status: Dict[str, bool] = {}
        self._failure_counts: Dict[str, int] = {}
        self._config_path = config_path
        self._load_config()

    def _load_config(self) -> None:
        """Load provider configuration from YAML and instantiate adapters."""
        ...

    def reload_config(self) -> None:
        """Hot-reload config from disk (called by POST /api/v1a/config/data-sources)."""
        ...

    def get_active_providers(self) -> List[DataProvider]:
        """Return enabled providers sorted by priority (1=highest)."""
        ...

    def fetch_ohlcv(self, ticker: str, period: str = "1y", preferred_source: Optional[str] = None) -> tuple:
        """Fetch OHLCV with fallback. Returns (DataFrame, provider_name)."""
        ...

    def get_live_price(self, ticker: str, preferred_source: Optional[str] = None) -> tuple:
        """Get live price with fallback. Returns (price, provider_name)."""
        ...

    def run_health_checks(self) -> Dict[str, bool]:
        """Execute health_check() on all providers. Auto-disable after 3 failures."""
        ...

    def get_status(self) -> List[Dict]:
        """Return status of all providers for admin UI."""
        ...
```

---

## New Data Models

```python
# Added to src/api/models.py

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class DataProviderConfig(BaseModel):
    """Configuration for a single data provider."""
    name: str = Field(description="Provider identifier (yfinance, bse_india, nse_india, alpha_vantage)")
    enabled: bool = Field(default=True)
    priority: int = Field(ge=1, le=10, description="1=highest priority")
    api_key_env_var: Optional[str] = Field(default=None, description="Env var holding the API key")
    rate_limit_per_min: int = Field(ge=1, description="Max requests per minute")
    timeout_seconds: int = Field(default=30, ge=5, le=120)


class LivePrice(BaseModel):
    """A single live price update."""
    ticker: str
    price: float
    timestamp: datetime
    source: str
    market_open: bool


class ConsumptionMetrics(BaseModel):
    """Full consumption metrics response."""
    openai: dict = Field(default_factory=dict)
    pinecone: dict = Field(default_factory=dict)
    yfinance: dict = Field(default_factory=dict)
    bse_india: dict = Field(default_factory=dict)
    nse_india: dict = Field(default_factory=dict)
    alpha_vantage: dict = Field(default_factory=dict)
    last_reset_at: Optional[datetime] = None
```

---

## Config File Schema

```yaml
# config/data_sources.yaml

providers:
  - name: yfinance
    enabled: true
    priority: 1
    api_key_env_var: null
    rate_limit_per_min: 100
    timeout_seconds: 30

  - name: bse_india
    enabled: true
    priority: 2
    api_key_env_var: null
    rate_limit_per_min: 10
    timeout_seconds: 30

  - name: nse_india
    enabled: true
    priority: 3
    api_key_env_var: null
    rate_limit_per_min: 5
    timeout_seconds: 30

  - name: alpha_vantage
    enabled: true
    priority: 4
    api_key_env_var: ALPHA_VANTAGE_API_KEY
    rate_limit_per_min: 5
    timeout_seconds: 30

# Polling settings
polling:
  interval_seconds: 60
  market_open_time: "09:15"
  market_close_time: "15:30"
  timezone: "Asia/Kolkata"
  rescore_on_close: true

# Health check settings
health:
  check_interval_minutes: 5
  max_consecutive_failures: 3
  cooldown_minutes: 15
```

---

## Frontend Component Additions

### LivePriceBanner.jsx

- Horizontal scrolling ticker strip at top of AnalysisPage
- Displays: ticker symbol, last price, ▲/▼ change %, timestamp, source badge
- Green/red background flash on price update
- "Market Closed" pill when outside market hours
- Auto-updates via 60s polling to `GET /api/v1a/live-prices`
- `data-testid="live-price-banner"`

### DataSourceSelector.jsx

- Cloudscape Select dropdown above results table
- Options: "Auto (priority chain)", "yfinance", "BSE India", "NSE India", "Alpha Vantage"
- Passes selected source to `POST /api/v1/analyze` as `preferred_source` param
- `data-testid="data-source-selector"`

### AdminDataSourcesTab.jsx

- Cloudscape Table with columns: Provider, Status Badge, Priority, Rate Limit, Usage %, Last Fetch
- Inline actions: Enable/Disable toggle, Move Up/Down priority, Edit Rate Limit modal
- Health indicator: green circle (healthy), red circle (unhealthy), grey circle (disabled)
- Refresh button triggers `GET /api/v1a/config/data-sources/status`
- `data-testid="admin-data-sources-tab"`

### UsageLimitsPanel.jsx

- Placed within the Observability tab as a sub-panel
- **Summary cards row**: Total API calls today, OpenAI tokens today, estimated cost (USD), at-risk providers count
- **Provider table**: Cloudscape Table with ProgressBar column for usage %
- **OpenAI breakdown**: PieChart (input/output tokens), LineChart (7-day trend), AreaChart (monthly cumulative)
- **Cost tracker**: current, projected, budget threshold with alert
- **Rate limit status**: per-provider remaining/min, auto-refresh 10s
- **Alerts**: Cloudscape Alert warning (80%), error (100%)
- Auto-poll 30s + manual Refresh button
- `data-testid="usage-limits-panel"`

---

## New Dependencies

| Library | Version | Purpose |
|---|---|---|
| `apscheduler` | 3.10.4 | Background scheduler for 60s live price polling and 5min health checks |
| `pyyaml` | 6.0.1 | Parse `config/data_sources.yaml` |
| `aiohttp` | 3.9.5 | Async HTTP client for BSE/NSE India API adapters |

Add to `requirements.txt`:
```
apscheduler==3.10.4
pyyaml==6.0.1
aiohttp==3.9.5
```

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

## File Layout (new/modified)

```
src/
├── data/
│   └── providers/
│       ├── __init__.py
│       ├── base.py                    # DataProvider ABC + ProviderError
│       ├── yfinance_provider.py       # YFinanceProvider adapter
│       ├── bse_india_provider.py      # BSEIndiaProvider adapter
│       ├── nse_india_provider.py      # NSEIndiaProvider adapter
│       ├── alpha_vantage_provider.py  # AlphaVantageProvider adapter
│       └── provider_manager.py        # ProviderManager (fallback, health, rate-limit)
├── api/
│   └── routes/
│       ├── data_sources.py            # POST /api/v1a/config/data-sources, GET status
│       ├── live_prices.py             # GET /api/v1a/live-prices
│       └── consumption.py            # GET /api/v1a/observability/consumption[/history]
├── observability/
│   └── consumption_tracker.py         # SQLite WAL counters, pre-flight dependency

config/
└── data_sources.yaml                  # Provider config (committed)

frontend/src/
├── components/
│   ├── LivePriceBanner.jsx
│   ├── DataSourceSelector.jsx
│   ├── AdminDataSourcesTab.jsx
│   └── UsageLimitsPanel.jsx
└── api/
    └── dataSourceApi.js               # API client for data sources + consumption endpoints

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
