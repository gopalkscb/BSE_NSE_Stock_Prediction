"""GET /api/v1/intraday/{ticker} — Alpha Vantage intraday data endpoint."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/api/v1")


class IntradayQuoteResponse(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class IntradayResponse(BaseModel):
    ticker: str
    last_price: float
    change: float
    change_pct: float
    day_high: float
    day_low: float
    day_open: float
    prev_close: float = 0.0
    volume: int
    vwap: float
    intraday_rsi: float
    intraday_macd: float
    intraday_macd_signal: float
    intraday_trend: str
    intraday_score: int
    confidence: str
    data_points: int
    last_refreshed: str
    source: str
    quotes: list[IntradayQuoteResponse] = Field(default_factory=list)


@router.get(
    "/intraday/{ticker}",
    response_model=IntradayResponse,
    summary="Get intraday data for a ticker",
    description="Fetches real-time intraday price data and indicators from Alpha Vantage.",
    responses={
        503: {"description": "Alpha Vantage API key not configured"},
        404: {"description": "Ticker not found or no data available"},
        429: {"description": "Alpha Vantage rate limit reached"},
    },
)
async def get_intraday(
    ticker: str,
    interval: str = Query("5min", pattern="^(1min|5min|15min|30min|60min)$"),
):
    """Fetch intraday data from Alpha Vantage with computed indicators."""
    from src.data.alpha_vantage_intraday import fetch_intraday

    try:
        result = await fetch_intraday(ticker, interval=interval)
        return IntradayResponse(
            ticker=result.ticker,
            last_price=result.last_price,
            change=result.change,
            change_pct=result.change_pct,
            day_high=result.day_high,
            day_low=result.day_low,
            day_open=result.day_open,
            prev_close=result.prev_close,
            volume=result.volume,
            vwap=result.vwap,
            intraday_rsi=result.intraday_rsi,
            intraday_macd=result.intraday_macd,
            intraday_macd_signal=result.intraday_macd_signal,
            intraday_trend=result.intraday_trend,
            intraday_score=result.intraday_score,
            confidence=result.confidence,
            data_points=result.data_points,
            last_refreshed=result.last_refreshed,
            source=result.source,
            quotes=[IntradayQuoteResponse(**q.__dict__) for q in result.quotes],
        )
    except ValueError as e:
        msg = str(e)
        if 'API_KEY' in msg or 'not configured' in msg:
            raise HTTPException(status_code=503, detail=msg)
        elif 'rate limit' in msg.lower():
            raise HTTPException(status_code=429, detail=msg)
        else:
            raise HTTPException(status_code=404, detail=msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intraday fetch failed: {str(e)}")
