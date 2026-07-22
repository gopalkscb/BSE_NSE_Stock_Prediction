"""Bullish scorer — rule-based scoring engine for stock tickers."""

import math
from src.api.models import IndicatorSet, SubScores, ScoredTicker


def score_rsi(rsi: float) -> int:
    """RSI sub-score: <30→20, 30-50→15, 50-70→10, >70→0."""
    if rsi < 30:
        return 20
    elif rsi <= 50:
        return 15
    elif rsi <= 70:
        return 10
    else:
        return 0


def score_macd(macd_line: float, signal: float, hist: float, hist_prev: float) -> int:
    """MACD sub-score: full alignment→20, above signal→12, below→0."""
    if macd_line > signal and hist > 0 and hist > hist_prev:
        return 20
    elif macd_line > signal:
        return 12
    else:
        return 0


def score_bollinger(close: float, upper: float, middle: float, lower: float) -> int:
    """Bollinger sub-score: <lower→20, lower-mid→12, mid-upper→6, >=upper→0."""
    if close < lower:
        return 20
    elif close < middle:
        return 12
    elif close < upper:
        return 6
    else:
        return 0


def score_moving_average(close: float, sma_50: float, sma_200: float) -> int:
    """MA sub-score: golden cross→20, above sma50→10, else→0."""
    if sma_50 > sma_200:
        return 20
    elif close > sma_50:
        return 10
    else:
        return 0


def score_volume(vol_5d: float, vol_20d: float) -> int:
    """Volume sub-score: >120%→20, 80-120%→10, <80%→0."""
    if vol_20d == 0:
        return 10
    ratio = vol_5d / vol_20d
    if ratio > 1.2:
        return 20
    elif ratio >= 0.8:
        return 10
    else:
        return 0


def derive_confidence(score: int) -> str:
    """75-100→'High', 50-74→'Medium', 0-49→'Low'."""
    if score >= 75:
        return "High"
    elif score >= 50:
        return "Medium"
    else:
        return "Low"


def compute_projected_range(last_close: float, log_return_std_30: float) -> tuple[float, float]:
    """
    Compute 30-day projected price range.
    lower = last_close * (1 - annualised_vol * sqrt(30/252))
    upper = last_close * (1 + annualised_vol * sqrt(30/252))
    """
    annualised_vol = log_return_std_30 * math.sqrt(252)
    factor = annualised_vol * math.sqrt(30 / 252)
    lower = last_close * (1 - factor)
    upper = last_close * (1 + factor)
    # Ensure positive and ordered
    lower = max(lower, 0.01)
    return lower, upper


def _derive_macd_label(macd_line: float, signal: float) -> str:
    """Derive MACD signal label."""
    if macd_line > signal:
        return "bullish"
    elif macd_line < signal:
        return "bearish"
    return "neutral"


def _derive_bb_label(close: float, upper: float, lower: float) -> str:
    """Derive Bollinger Band signal label."""
    if close < lower:
        return "oversold"
    elif close > upper:
        return "overbought"
    return "neutral"


def _derive_ma_label(close: float, sma_50: float, sma_200: float) -> str:
    """Derive Moving Average signal label."""
    if sma_50 > sma_200:
        return "golden_cross"
    elif close > sma_50:
        return "above_ma"
    return "below_ma"


def _derive_volume_label(vol_5d: float, vol_20d: float) -> str:
    """Derive Volume signal label."""
    if vol_20d == 0:
        return "normal"
    ratio = vol_5d / vol_20d
    if ratio > 1.2:
        return "high"
    elif ratio < 0.8:
        return "low"
    return "normal"


def score_ticker(indicators: IndicatorSet, ohlcv_90d: list[dict]) -> ScoredTicker:
    """Assemble all sub-scores into a ScoredTicker."""
    sub = SubScores(
        rsi=score_rsi(indicators.rsi),
        macd=score_macd(
            indicators.macd_line, indicators.macd_signal,
            indicators.macd_histogram, indicators.macd_histogram_prev
        ),
        bollinger=score_bollinger(
            indicators.last_close, indicators.bb_upper,
            indicators.bb_middle, indicators.bb_lower
        ),
        moving_avg=score_moving_average(
            indicators.last_close, indicators.sma_50, indicators.sma_200
        ),
        volume=score_volume(indicators.vol_5d_avg, indicators.vol_20d_avg),
    )

    bullish_score = sub.rsi + sub.macd + sub.bollinger + sub.moving_avg + sub.volume
    confidence = derive_confidence(bullish_score)
    projected_lower, projected_upper = compute_projected_range(
        indicators.last_close, indicators.log_return_std_30
    )

    return ScoredTicker(
        ticker=indicators.ticker,
        bullish_score=bullish_score,
        confidence=confidence,
        sub_scores=sub,
        rsi_value=indicators.rsi,
        macd_signal_label=_derive_macd_label(indicators.macd_line, indicators.macd_signal),
        bb_signal_label=_derive_bb_label(indicators.last_close, indicators.bb_upper, indicators.bb_lower),
        ma_signal_label=_derive_ma_label(indicators.last_close, indicators.sma_50, indicators.sma_200),
        volume_signal_label=_derive_volume_label(indicators.vol_5d_avg, indicators.vol_20d_avg),
        projected_lower=projected_lower,
        projected_upper=projected_upper,
        ohlcv_90d=ohlcv_90d,
    )


def rank_tickers(scored: list[ScoredTicker]) -> list[ScoredTicker]:
    """Sort descending by bullish_score, return all results (paginated by frontend)."""
    sorted_tickers = sorted(scored, key=lambda t: t.bullish_score, reverse=True)
    return sorted_tickers
