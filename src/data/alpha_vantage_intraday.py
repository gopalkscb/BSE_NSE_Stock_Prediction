"""
Intraday data fetcher for Live Data tab.
- Uses Alpha Vantage GLOBAL_QUOTE (free tier, 25 calls/day) for live price snapshot
- Uses yfinance intraday (period='1d', interval='5m') for intraday OHLCV chart data
- Computes intraday RSI, MACD, VWAP from yfinance data
"""

import os
import httpx
import yfinance as yf
import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from datetime import datetime


ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query"


@dataclass
class IntradayQuote:
    """Single intraday price point."""
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: int


@dataclass
class IntradayResult:
    """Full intraday analysis result for a single ticker."""
    ticker: str
    last_price: float
    change: float
    change_pct: float
    day_high: float
    day_low: float
    day_open: float
    prev_close: float
    volume: int
    vwap: float
    intraday_rsi: float
    intraday_macd: float
    intraday_macd_signal: float
    intraday_trend: str  # 'bullish' | 'bearish' | 'neutral'
    intraday_score: int  # 0-100
    confidence: str  # 'High' | 'Medium' | 'Low'
    data_points: int
    last_refreshed: str
    source: str  # 'alpha_vantage + yfinance'
    quotes: list[IntradayQuote] = field(default_factory=list)


def _compute_rsi(prices: pd.Series, period: int = 14) -> float:
    """Compute RSI from a price series."""
    if len(prices) < period + 1:
        return 50.0
    delta = prices.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.rolling(window=period, min_periods=period).mean().iloc[-1]
    avg_loss = loss.rolling(window=period, min_periods=period).mean().iloc[-1]
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100.0 - (100.0 / (1.0 + rs)), 2)


def _compute_macd(prices: pd.Series) -> tuple[float, float]:
    """Compute MACD line and signal line."""
    if len(prices) < 26:
        return 0.0, 0.0
    ema12 = prices.ewm(span=12).mean()
    ema26 = prices.ewm(span=26).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9).mean()
    return round(macd_line.iloc[-1], 4), round(signal_line.iloc[-1], 4)


def _compute_vwap(df: pd.DataFrame) -> float:
    """Compute VWAP from OHLCV data."""
    if df['volume'].sum() == 0:
        return df['close'].iloc[-1]
    typical_price = (df['high'] + df['low'] + df['close']) / 3
    vwap = (typical_price * df['volume']).sum() / df['volume'].sum()
    return round(vwap, 2)


async def _fetch_global_quote(ticker: str) -> dict:
    """
    Fetch latest price quote from Alpha Vantage GLOBAL_QUOTE (free tier).
    Returns dict with price, change, change_pct, volume, prev_close.
    """
    api_key = os.environ.get('ALPHA_VANTAGE_API_KEY', '')
    if not api_key:
        return {}  # Will fallback to yfinance data

    # Alpha Vantage symbol format for Indian stocks
    av_symbol = ticker.replace('.NS', '.BSE').replace('.BO', '.BSE')

    params = {
        'function': 'GLOBAL_QUOTE',
        'symbol': av_symbol,
        'apikey': api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(ALPHA_VANTAGE_BASE, params=params)
            response.raise_for_status()
            data = response.json()

        if 'Global Quote' in data and data['Global Quote']:
            gq = data['Global Quote']
            return {
                'price': float(gq.get('05. price', 0)),
                'change': float(gq.get('09. change', 0)),
                'change_pct': float(gq.get('10. change percent', '0').replace('%', '')),
                'volume': int(gq.get('06. volume', 0)),
                'prev_close': float(gq.get('08. previous close', 0)),
                'day_high': float(gq.get('03. high', 0)),
                'day_low': float(gq.get('04. low', 0)),
                'day_open': float(gq.get('02. open', 0)),
                'last_refreshed': gq.get('07. latest trading day', ''),
            }
    except Exception:
        pass  # Fallback to yfinance

    return {}


def _fetch_yfinance_intraday(ticker: str, interval: str = "5m") -> pd.DataFrame:
    """
    Fetch intraday data from yfinance (free, no API key required).
    period='1d' gives today's intraday bars.
    """
    try:
        tk = yf.Ticker(ticker)
        # yfinance intervals: 1m, 2m, 5m, 15m, 30m, 60m, 90m
        df = tk.history(period="1d", interval=interval)
        if df.empty:
            # Try 5 days for markets that may be closed today
            df = tk.history(period="5d", interval=interval)
        if not df.empty:
            df = df.reset_index()
            df.columns = [c.lower().replace(' ', '_') for c in df.columns]
            # Rename 'datetime' or 'date' to 'timestamp'
            if 'datetime' in df.columns:
                df = df.rename(columns={'datetime': 'timestamp'})
            elif 'date' in df.columns:
                df = df.rename(columns={'date': 'timestamp'})
            df['timestamp'] = df['timestamp'].astype(str)
        return df
    except Exception:
        return pd.DataFrame()


async def fetch_intraday(ticker: str, interval: str = "5m") -> IntradayResult:
    """
    Fetch intraday data using:
    1. Alpha Vantage GLOBAL_QUOTE for live price snapshot (free, 25/day)
    2. yfinance for intraday OHLCV bars (free, no limit)
    
    Args:
        ticker: Stock symbol (e.g., 'RELIANCE.NS')
        interval: '1m', '5m', '15m', '30m', '60m'
    
    Returns:
        IntradayResult with live price, intraday indicators, and score.
    """
    # Map frontend interval values to yfinance format
    interval_map = {'1min': '1m', '5min': '5m', '15min': '15m', '30min': '30m', '60min': '60m'}
    yf_interval = interval_map.get(interval, interval)

    # Step 1: Get intraday bars from yfinance (always works, free)
    df = _fetch_yfinance_intraday(ticker, yf_interval)
    if df.empty or len(df) < 5:
        raise ValueError(f"No intraday data available for {ticker}. Market may be closed or ticker invalid.")

    # Step 2: Try Alpha Vantage for live quote (optional, enhances with real-time price)
    av_quote = await _fetch_global_quote(ticker)

    # Compute from yfinance data
    close_prices = df['close']
    last_price = av_quote.get('price') or close_prices.iloc[-1]
    day_open = av_quote.get('day_open') or df['open'].iloc[0]
    day_high = av_quote.get('day_high') or df['high'].max()
    day_low = av_quote.get('day_low') or df['low'].min()
    volume = av_quote.get('volume') or int(df['volume'].sum())
    prev_close = av_quote.get('prev_close') or day_open

    change = round(last_price - prev_close, 2)
    change_pct = round((change / prev_close) * 100, 2) if prev_close != 0 else 0.0

    # Intraday indicators from yfinance bars
    rsi = _compute_rsi(close_prices)
    macd_line, macd_signal = _compute_macd(close_prices)
    vwap = _compute_vwap(df)

    # Intraday trend determination
    if rsi < 30 and macd_line > macd_signal:
        trend = 'bullish'
    elif rsi > 70 and macd_line < macd_signal:
        trend = 'bearish'
    elif macd_line > macd_signal and change_pct > 0:
        trend = 'bullish'
    elif macd_line < macd_signal and change_pct < 0:
        trend = 'bearish'
    else:
        trend = 'neutral'

    # Intraday score (0-100)
    score = 50
    if rsi < 30:
        score += 20
    elif rsi < 50:
        score += 10
    elif rsi > 70:
        score -= 20
    elif rsi > 50:
        score -= 5

    if macd_line > macd_signal:
        score += 15
    else:
        score -= 10

    if change_pct > 1.5:
        score += 15
    elif change_pct > 0.5:
        score += 8
    elif change_pct < -1.5:
        score -= 15
    elif change_pct < -0.5:
        score -= 8

    score = max(0, min(100, score))
    confidence = 'High' if score >= 75 else 'Medium' if score >= 50 else 'Low'

    # Build quote list for chart
    quotes = [
        IntradayQuote(
            timestamp=str(row['timestamp']),
            open=round(row['open'], 2),
            high=round(row['high'], 2),
            low=round(row['low'], 2),
            close=round(row['close'], 2),
            volume=int(row['volume']),
        )
        for _, row in df.tail(78).iterrows()  # ~6.5 hours of 5-min bars
    ]

    source = 'alpha_vantage + yfinance' if av_quote else 'yfinance'
    last_refreshed = av_quote.get('last_refreshed') or str(df['timestamp'].iloc[-1])

    return IntradayResult(
        ticker=ticker,
        last_price=round(last_price, 2),
        change=change,
        change_pct=change_pct,
        day_high=round(day_high, 2),
        day_low=round(day_low, 2),
        day_open=round(day_open, 2),
        prev_close=round(prev_close, 2),
        volume=volume,
        vwap=vwap,
        intraday_rsi=rsi,
        intraday_macd=macd_line,
        intraday_macd_signal=macd_signal,
        intraday_trend=trend,
        intraday_score=score,
        confidence=confidence,
        data_points=len(df),
        last_refreshed=last_refreshed,
        source=source,
        quotes=quotes,
    )
