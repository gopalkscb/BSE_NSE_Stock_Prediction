"""Technical indicator calculator — RSI, MACD, Bollinger Bands, SMA, EMA, Volume."""

import numpy as np
import pandas as pd
from src.api.models import IndicatorSet


def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    """Wilder's smoothed RSI. Output always in [0, 100]."""
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)

    avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0, np.inf)
    rsi = 100 - (100 / (1 + rs))
    return rsi.clip(0, 100)


def compute_macd(
    close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Returns (macd_line, signal_line, histogram). macd_line = fast_ema - slow_ema."""
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def compute_bollinger_bands(
    close: pd.Series, period: int = 20, num_std: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Returns (upper, middle, lower). upper > middle > lower for valid windows."""
    middle = close.rolling(window=period).mean()
    std = close.rolling(window=period).std()
    upper = middle + (num_std * std)
    lower = middle - (num_std * std)
    return upper, middle, lower


def compute_sma(close: pd.Series, period: int) -> pd.Series:
    """Rolling simple moving average."""
    return close.rolling(window=period).mean()


def compute_ema(close: pd.Series, period: int) -> pd.Series:
    """Exponential moving average."""
    return close.ewm(span=period, adjust=False).mean()


def compute_volume_trend(volume: pd.Series) -> tuple[float, float]:
    """Returns (avg_5d, avg_20d) of daily volume."""
    avg_5d = volume.iloc[-5:].mean()
    avg_20d = volume.iloc[-20:].mean()
    return float(avg_5d), float(avg_20d)


def compute_indicators(df: pd.DataFrame, ticker: str) -> IndicatorSet:
    """
    Top-level orchestrator. Computes all indicators and returns an IndicatorSet.
    Requires df to have columns: Open, High, Low, Close, Volume.
    """
    close = df["Close"]
    volume = df["Volume"]

    # RSI
    rsi_series = compute_rsi(close)
    rsi_value = float(rsi_series.iloc[-1])

    # MACD
    macd_line, signal_line, histogram = compute_macd(close)
    macd_val = float(macd_line.iloc[-1])
    signal_val = float(signal_line.iloc[-1])
    hist_val = float(histogram.iloc[-1])
    hist_prev = float(histogram.iloc[-2]) if len(histogram) > 1 else 0.0

    # Bollinger Bands
    bb_upper, bb_middle, bb_lower = compute_bollinger_bands(close)

    # SMAs
    sma_50 = compute_sma(close, 50)
    sma_200 = compute_sma(close, 200)

    # EMA
    ema_20 = compute_ema(close, 20)

    # Volume trend
    vol_5d, vol_20d = compute_volume_trend(volume)

    # Log return std (30 days)
    log_returns = np.log(close / close.shift(1)).dropna()
    log_return_std_30 = float(log_returns.iloc[-30:].std()) if len(log_returns) >= 30 else 0.01

    return IndicatorSet(
        ticker=ticker,
        rsi=rsi_value,
        macd_line=macd_val,
        macd_signal=signal_val,
        macd_histogram=hist_val,
        macd_histogram_prev=hist_prev,
        bb_upper=float(bb_upper.iloc[-1]),
        bb_middle=float(bb_middle.iloc[-1]),
        bb_lower=float(bb_lower.iloc[-1]),
        sma_50=float(sma_50.iloc[-1]),
        sma_200=float(sma_200.iloc[-1]),
        ema_20=float(ema_20.iloc[-1]),
        vol_5d_avg=vol_5d,
        vol_20d_avg=vol_20d,
        last_close=float(close.iloc[-1]),
        log_return_std_30=log_return_std_30,
    )
