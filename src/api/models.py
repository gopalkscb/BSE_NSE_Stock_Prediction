"""
Pydantic v2 models and dataclasses for the Bullish Stock Predictor.
All shared data models live here — no model definitions elsewhere.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ─── Request / Response Models ───────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    """Request body for POST /api/v1/analyze."""
    tickers: list[str] = Field(..., min_length=1, max_length=500)


class SubScores(BaseModel):
    """Individual indicator sub-scores (0–20 each)."""
    rsi: int = Field(..., ge=0, le=20)
    macd: int = Field(..., ge=0, le=20)
    bollinger: int = Field(..., ge=0, le=20)
    moving_avg: int = Field(..., ge=0, le=20)
    volume: int = Field(..., ge=0, le=20)


class ScoredTicker(BaseModel):
    """Fully scored ticker with all indicator signals and projections."""
    ticker: str
    bullish_score: int = Field(..., ge=0, le=100)
    confidence: str  # "High" | "Medium" | "Low"
    sub_scores: SubScores
    rsi_value: float
    macd_signal_label: str  # "bullish" | "neutral" | "bearish"
    bb_signal_label: str  # "oversold" | "neutral" | "overbought"
    ma_signal_label: str  # "golden_cross" | "above_ma" | "below_ma"
    volume_signal_label: str  # "high" | "normal" | "low"
    projected_lower: float
    projected_upper: float
    ohlcv_90d: list[dict] = Field(default_factory=list)


class FailedTicker(BaseModel):
    """A ticker that failed during analysis."""
    ticker: str
    reason: str


class AnalyzeResponse(BaseModel):
    """Response body for POST /api/v1/analyze."""
    results: list[ScoredTicker]
    failed: list[FailedTicker] = Field(default_factory=list)


# ─── Internal Data Models ────────────────────────────────────────────────────

class IndicatorSet(BaseModel):
    """Computed technical indicators for a single ticker."""
    ticker: str
    rsi: float
    macd_line: float
    macd_signal: float
    macd_histogram: float
    macd_histogram_prev: float
    bb_upper: float
    bb_middle: float
    bb_lower: float
    sma_50: float
    sma_200: float
    ema_20: float
    vol_5d_avg: float
    vol_20d_avg: float
    last_close: float
    log_return_std_30: float


# ─── Observability Models ────────────────────────────────────────────────────

class MetricEvent(BaseModel):
    """A single metric data point."""
    timestamp: str
    metric_name: str
    metric_value: float
    labels: Optional[dict] = None


class MetricSummary(BaseModel):
    """Aggregated metric counters."""
    total_requests: int = 0
    avg_latency_ms: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0
    total_errors: int = 0
    total_warnings: int = 0
    failed_ticker_rate: float = 0.0


class MetricsResponse(BaseModel):
    """Response for GET /api/v1/observability/metrics."""
    summary: MetricSummary
    recent: list[MetricEvent] = Field(default_factory=list)


class ErrorLogEntry(BaseModel):
    """A single error/warning log entry."""
    id: int
    timestamp: str
    level: str
    source_module: str
    message: str
    details: Optional[dict] = None


class ErrorLogResponse(BaseModel):
    """Response for GET /api/v1/observability/errors."""
    entries: list[ErrorLogEntry] = Field(default_factory=list)
    total_count: int = 0
    limit: int = 50
    offset: int = 0


class TickerHealthEntry(BaseModel):
    """Per-ticker health record."""
    ticker: str
    total_requests: int = 0
    total_failures: int = 0
    failure_rate: float = 0.0
    last_failure_reason: Optional[str] = None
    last_success_at: Optional[str] = None
    last_failure_at: Optional[str] = None
    avg_confidence_score: Optional[float] = None
    low_confidence_count: int = 0


class TickerHealthResponse(BaseModel):
    """Response for GET /api/v1/observability/ticker-health."""
    tickers: list[TickerHealthEntry] = Field(default_factory=list)


class FaqEntry(BaseModel):
    """A single FAQ entry."""
    id: str
    question: str
    answer: str
    tags: list[str] = Field(default_factory=list)
    related_metric: Optional[str] = None


class FaqCategory(BaseModel):
    """A FAQ category with entries."""
    id: str
    name: str
    entries: list[FaqEntry] = Field(default_factory=list)


class FaqResponse(BaseModel):
    """Response for GET /api/v1/observability/faq."""
    categories: list[FaqCategory] = Field(default_factory=list)
