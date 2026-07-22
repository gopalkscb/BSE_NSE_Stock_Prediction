"""GET /api/v1/ticker/{ticker} — detail endpoint for a single analysed ticker."""

from fastapi import APIRouter, HTTPException
from src.api.models import ScoredTicker
from src.api import cache

router = APIRouter()


@router.get(
    "/api/v1/ticker/{ticker}",
    response_model=ScoredTicker,
    summary="Get ticker detail",
    description="Returns full indicator breakdown and 90-day OHLCV for a previously analysed ticker.",
    responses={404: {"description": "Ticker not found in cache"}},
)
async def get_ticker(ticker: str) -> ScoredTicker:
    """Look up ticker in session cache. Returns 404 if not analysed yet."""
    result = cache.get(ticker)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Ticker '{ticker}' has not been analysed. Run POST /api/v1/analyze first.",
        )
    return result
