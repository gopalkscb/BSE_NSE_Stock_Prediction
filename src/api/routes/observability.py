"""GET /api/v1/observability/* — metrics, errors, ticker-health, faq endpoints."""

import json
from pathlib import Path
from fastapi import APIRouter, Query
from src.api.models import (
    MetricsResponse, MetricSummary, MetricEvent,
    ErrorLogResponse, ErrorLogEntry,
    TickerHealthResponse, TickerHealthEntry,
    FaqResponse, FaqCategory, FaqEntry,
)
from src.observability.store import get_metrics, get_errors, get_ticker_health, get_metric_summary

router = APIRouter(prefix="/api/v1/observability")


@router.get(
    "/metrics",
    response_model=MetricsResponse,
    summary="Get observability metrics",
    description="Returns aggregated metric summary and recent metric events.",
)
async def observability_metrics() -> MetricsResponse:
    summary_data = await get_metric_summary()
    recent_data = await get_metrics(limit=50)

    summary = MetricSummary(**summary_data)
    recent = [MetricEvent(**m) for m in recent_data]

    return MetricsResponse(summary=summary, recent=recent)


@router.get(
    "/errors",
    response_model=ErrorLogResponse,
    summary="Get error log",
    description="Returns paginated error/warning log with optional level filter.",
)
async def observability_errors(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    level: str | None = Query(None, pattern="^(ERROR|WARNING)$"),
) -> ErrorLogResponse:
    entries_data, total_count = await get_errors(limit=limit, offset=offset, level=level)
    entries = [ErrorLogEntry(**e) for e in entries_data]

    return ErrorLogResponse(
        entries=entries,
        total_count=total_count,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/ticker-health",
    response_model=TickerHealthResponse,
    summary="Get per-ticker health data",
    description="Returns health records for all analysed tickers sorted by failure rate.",
)
async def observability_ticker_health() -> TickerHealthResponse:
    health_data = await get_ticker_health()
    tickers = [TickerHealthEntry(**h) for h in health_data]
    return TickerHealthResponse(tickers=tickers)


@router.get(
    "/faq",
    response_model=FaqResponse,
    summary="Get FAQ knowledge base",
    description="Returns the static FAQ/debug guide from docs/faq.json.",
)
async def observability_faq() -> FaqResponse:
    faq_path = Path("docs/faq.json")
    if not faq_path.exists():
        return FaqResponse(categories=[])

    with open(faq_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    categories = []
    for cat_data in data.get("categories", []):
        entries = [FaqEntry(**e) for e in cat_data.get("entries", [])]
        categories.append(FaqCategory(id=cat_data["id"], name=cat_data["name"], entries=entries))

    return FaqResponse(categories=categories)
