"""yfinance wrapper for fetching historical OHLCV data."""

import logging
from dataclasses import dataclass
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class FetchResult:
    """Result of a single ticker fetch attempt."""
    ticker: str
    status: str  # "ok" | "insufficient_data" | "failed"
    df: Optional[pd.DataFrame] = None
    error: Optional[str] = None


def apply_exchange_suffix(ticker: str) -> str:
    """Return ticker unchanged if it already ends with .NS or .BO (idempotent guard)."""
    if ticker.endswith(".NS") or ticker.endswith(".BO"):
        return ticker
    return ticker


def fetch_ticker(ticker: str, period: str = "1y") -> FetchResult:
    """
    Download daily OHLCV data for a single ticker via yfinance.
    Returns FetchResult with status='insufficient_data' if fewer than 50 rows.
    Returns FetchResult with status='failed' on any exception.
    
    For .BO (BSE) tickers with insufficient data, automatically falls back to .NS (NSE)
    since the same stocks trade on both exchanges but yfinance has spotty BSE data.
    """
    try:
        import yfinance as yf

        ticker_str = apply_exchange_suffix(ticker)
        data = yf.download(ticker_str, period=period, progress=False, auto_adjust=True)

        # yfinance 0.2.40+ returns MultiIndex columns like ('Close', 'TCS.NS')
        # Flatten to simple column names: Close, High, Low, Open, Volume
        if data is not None and hasattr(data.columns, "levels"):
            data.columns = data.columns.get_level_values(0)

        # If BSE ticker has insufficient data, try NSE equivalent
        if (data is None or len(data) < 50) and ticker_str.endswith(".BO"):
            nse_ticker = ticker_str[:-3] + ".NS"
            logger.info(f"BSE ticker {ticker_str} has insufficient data ({len(data) if data is not None else 0} rows), trying NSE: {nse_ticker}")
            data = yf.download(nse_ticker, period=period, progress=False, auto_adjust=True)
            if data is not None and hasattr(data.columns, "levels"):
                data.columns = data.columns.get_level_values(0)

        if data is None or len(data) < 50:
            return FetchResult(
                ticker=ticker,
                status="insufficient_data",
                df=None,
                error=f"Only {len(data) if data is not None else 0} rows returned (minimum 50 required)",
            )

        # Ensure standard OHLCV column names exist
        required_cols = {"Open", "High", "Low", "Close", "Volume"}
        if not required_cols.issubset(set(data.columns)):
            return FetchResult(
                ticker=ticker,
                status="failed",
                df=None,
                error=f"Missing columns. Got: {data.columns.tolist()}, need: {required_cols}",
            )

        return FetchResult(ticker=ticker, status="ok", df=data)

    except Exception as e:
        logger.error(f"Fetch failed for {ticker}: {e}")
        return FetchResult(ticker=ticker, status="failed", df=None, error=str(e))


def fetch_batch(tickers: list[str]) -> list[FetchResult]:
    """
    Fetch all tickers sequentially.
    Returns one FetchResult per ticker regardless of individual failures.
    ThreadPoolExecutor concurrency deferred to MVP1b.
    """
    results = []
    for ticker in tickers:
        result = fetch_ticker(ticker)
        results.append(result)
    return results
