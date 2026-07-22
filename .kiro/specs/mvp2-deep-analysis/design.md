# Design Document — MVP2 Deep-Dive Algorithmic Analysis Engine

## Overview

MVP2 extends the MVP1 Bullish Stock Predictor with 6 additional indicators (11 total), configurable weighted scoring, historical backtesting, portfolio simulation, persistent SQLite caching, full OWASP security guardrails, and a comprehensive observability stack including Prometheus metrics and a protected admin dashboard.

---

## High-Level System Architecture (MVP2 Additions)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                       │
│  All MVP1 components PLUS:                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ WeightsModal │  │ AdminDashboard│  │ StatusBanner        │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└────────────────────────────│────────────────────────────────────┘
                             │ HTTP/JSON (CORS)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (src/api/)                     │
│                                                                 │
│  Middleware Stack (new in MVP2):                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ SecurityHeadersMiddleware → RateLimitMiddleware           │ │
│  │ → ContentSizeLimitMiddleware → RequestLoggingMiddleware   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  API v1 routes (unchanged from MVP1)                            │
│  API v2 routes (new):                                           │
│    POST /api/v2/config/weights                                  │
│    POST /api/v2/backtest                                        │
│    GET  /api/v2/backtest/{job_id}                                │
│    POST /api/v2/portfolio/simulate                              │
│    GET  /api/v2/cache/status                                    │
│    GET  /api/v2/security/events                                 │
│    GET  /api/v2/security/audit-status                           │
│    GET  /api/v2/admin/verify                                    │
│    GET  /metrics                                                │
│    GET  /health                                                 │
│    GET  /health/ready                                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ SQLite Cache (data/cache.db) — replaces in-memory dict     │ │
│  │ TTL: 4 hours per entry                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Observability: structlog + prometheus-fastapi-instrumentator│ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## New Module Signatures (MVP2)

### `src/features/indicator_calculator_v2.py`

```python
import pandas as pd
from src.api.models import EnhancedIndicatorSet

def compute_stochastic(high: pd.Series, low: pd.Series, close: pd.Series,
                       k_period: int = 14, k_smooth: int = 3, d_smooth: int = 3
                       ) -> tuple[pd.Series, pd.Series]:
    """Returns (%K, %D). Both always in [0, 100]."""
    ...

def compute_mfi(high: pd.Series, low: pd.Series, close: pd.Series,
               volume: pd.Series, period: int = 14) -> pd.Series:
    """Money Flow Index. Output always in [0, 100]."""
    ...

def compute_adx_dmi(high: pd.Series, low: pd.Series, close: pd.Series,
                    period: int = 14) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Returns (ADX, +DI, -DI). ADX in [0, 100]."""
    ...

def compute_supertrend(high: pd.Series, low: pd.Series, close: pd.Series,
                       period: int = 10, multiplier: float = 3.0
                       ) -> tuple[pd.Series, pd.Series]:
    """Returns (supertrend_line, direction). Direction: 1=up, -1=down."""
    ...

def compute_obv(close: pd.Series, volume: pd.Series) -> tuple[pd.Series, float]:
    """Returns (OBV series, 10-day slope)."""
    ...

def compute_vwap(high: pd.Series, low: pd.Series, close: pd.Series,
                volume: pd.Series) -> pd.Series:
    """Volume Weighted Average Price."""
    ...

def compute_enhanced_indicators(df: pd.DataFrame, ticker: str) -> EnhancedIndicatorSet:
    """Calls all MVP1 + MVP2 compute functions. Returns all 11 indicator values."""
    ...
```

### `src/models/bullish_scorer_v2.py`

```python
def score_stochastic(k_value: float) -> int:
    """<20→20, 20-50→12, 50-80→6, >80→0"""
    ...

def score_mfi(mfi: float) -> int:
    """<20→20, 20-40→15, 40-60→10, 60-80→5, >80→0"""
    ...

def score_adx(adx: float, plus_di: float, minus_di: float) -> int:
    """ADX>25 + +DI>-DI → 20, ADX>25 only → 10, else → 0"""
    ...

def score_supertrend(close: float, supertrend: float, direction: int) -> int:
    """Above + up direction → 20, at crossover → 10, below → 0"""
    ...

def score_obv(slope_10d: float) -> int:
    """Rising → 20, flat → 10, falling → 0"""
    ...

def score_vwap(close: float, vwap: float) -> int:
    """Below VWAP → 20, at VWAP → 10, above → 5"""
    ...

def compute_enhanced_score(indicators: EnhancedIndicatorSet,
                          weights: dict[str, float]) -> int:
    """Weighted sum normalised to [0, 100]. Formula: (sum(w_i * s_i) / sum(w_i * 20)) * 100"""
    ...
```

### `src/api/middleware/security.py`

```python
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds X-Content-Type-Options, X-Frame-Options, X-XSS-Protection,
    Content-Security-Policy, Strict-Transport-Security (prod only)."""
    ...

class ContentSizeLimitMiddleware(BaseHTTPMiddleware):
    """Rejects requests with Content-Length > 64KB with HTTP 413."""
    ...

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """structlog JSON logging per request with request_id, duration_ms, etc."""
    ...
```

### `src/api/auth.py`

```python
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader
import hmac

def verify_api_key(api_key: str = Security(APIKeyHeader(name="X-API-Key"))):
    """Constant-time comparison via hmac.compare_digest. Returns 401 on failure."""
    ...
```

### `src/observability/metrics.py`

```python
from prometheus_fastapi_instrumentator import Instrumentator

def setup_metrics(app):
    """Attach prometheus instrumentator + custom metrics."""
    ...
```

---

## New Data Models (MVP2)

```python
@dataclass
class EnhancedIndicatorSet(IndicatorSet):
    """Extends MVP1 IndicatorSet with 6 new fields."""
    stochastic_k: float
    stochastic_d: float
    mfi: float
    adx: float
    plus_di: float
    minus_di: float
    supertrend: float
    supertrend_direction: int  # 1=up, -1=down
    obv_slope_10d: float
    vwap: float

@dataclass
class EnhancedSubScores(SubScores):
    """Extends MVP1 SubScores with 6 new sub-scores."""
    stochastic: int   # 0 | 6 | 12 | 20
    mfi: int          # 0 | 5 | 10 | 15 | 20
    adx: int          # 0 | 10 | 20
    supertrend: int   # 0 | 10 | 20
    obv: int          # 0 | 10 | 20
    vwap: int         # 5 | 10 | 20

class WeightsConfig(BaseModel):
    """Pydantic model for /api/v2/config/weights."""
    rsi: float = Field(1.0, ge=0.0, le=5.0)
    macd: float = Field(1.0, ge=0.0, le=5.0)
    bollinger: float = Field(1.0, ge=0.0, le=5.0)
    moving_average: float = Field(1.0, ge=0.0, le=5.0)
    volume_trend: float = Field(1.0, ge=0.0, le=5.0)
    stochastic: float = Field(1.0, ge=0.0, le=5.0)
    mfi: float = Field(1.0, ge=0.0, le=5.0)
    adx: float = Field(1.0, ge=0.0, le=5.0)
    supertrend: float = Field(1.0, ge=0.0, le=5.0)
    obv: float = Field(1.0, ge=0.0, le=5.0)
    vwap: float = Field(1.0, ge=0.0, le=5.0)

class BacktestRequest(BaseModel):
    tickers: list[str]
    start_date: str  # ISO format
    end_date: str
    weights: WeightsConfig | None = None

class BacktestResult(BaseModel):
    ticker: str
    win_rate: float
    avg_return_high: float
    avg_return_medium: float
    avg_return_low: float
    max_drawdown: float

class SecurityEvent(BaseModel):
    timestamp: str
    event_type: str  # auth_failure | validation_failure | rate_limited
    client_ip: str
    path: str
```

---

## Frontend Component Additions (MVP2)

```
frontend/src/
├── pages/
│   ├── AnalysisPage.jsx      # Updated: adds StatusBanner + disclaimer Alert
│   └── AdminDashboard.jsx    # NEW: 5-tab admin dashboard (/admin route)
├── components/
│   ├── StatusBanner.jsx      # NEW: Flashbar polling /health
│   ├── WeightsModal.jsx      # NEW: Settings modal with 11 sliders
│   ├── BacktestPanel.jsx     # NEW: ExpandableSection + BarChart
│   └── PortfolioTab.jsx      # NEW: AreaChart + stats table
└── api/
    └── stockApi.js           # Updated: add v2 API functions
```

---

## MVP2 Dependencies (additions to requirements.txt)

```
pandas-ta==0.3.14b
aiosqlite==0.20.0
slowapi==0.1.9
prometheus-fastapi-instrumentator==6.1.0
structlog==24.1.0
pip-audit==2.7.3
detect-secrets==1.4.0
pyyaml==6.0.1
pydantic-settings==2.2.1
```

---

## Configuration Files (MVP2)

```yaml
# config/indicator_weights.yaml
rsi: 1.0
macd: 1.0
bollinger: 1.0
moving_average: 1.0
volume_trend: 1.0
stochastic: 1.0
mfi: 1.0
adx: 1.0
supertrend: 1.0
obv: 1.0
vwap: 1.0
```

---

## Security Middleware Stack Order

```
Request → CORS → SecurityHeaders → ContentSizeLimit → RateLimit → RequestLogging → Route Handler
```

---

## Error Handling (MVP2 additions)

| Scenario | Backend | Frontend |
|---|---|---|
| Admin endpoint without API key | HTTP 401 `{"detail": "Unauthorized"}` | Redirect to key entry |
| Rate limit exceeded | HTTP 429 + Retry-After header | Alert with retry countdown |
| Body too large | HTTP 413 | Alert: "Request too large" |
| Ticker fails regex allowlist | HTTP 422 `{"detail": "invalid_ticker_format"}` | Inline error |
| Backtest job not found | HTTP 404 | Alert in backtest panel |
| Cache unavailable | `/health/ready` returns 503 | Amber status banner |
