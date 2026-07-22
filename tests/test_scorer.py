"""Smoke tests for src/models/bullish_scorer.py."""

from src.models.bullish_scorer import (
    score_rsi, score_macd, score_bollinger, score_moving_average,
    score_volume, derive_confidence, compute_projected_range,
    score_ticker, rank_tickers,
)
from src.api.models import IndicatorSet, ScoredTicker


def test_score_ticker_in_range():
    """Bullish score is always in [0, 100]."""
    indicators = IndicatorSet(
        ticker="TEST.NS", rsi=45.0, macd_line=0.5, macd_signal=0.3,
        macd_histogram=0.2, macd_histogram_prev=0.1,
        bb_upper=110.0, bb_middle=100.0, bb_lower=90.0,
        sma_50=102.0, sma_200=98.0, ema_20=101.0,
        vol_5d_avg=5000000, vol_20d_avg=4000000,
        last_close=105.0, log_return_std_30=0.02,
    )
    result = score_ticker(indicators, [])
    assert 0 <= result.bullish_score <= 100
    assert result.confidence in ("High", "Medium", "Low")


def test_rank_tickers_max_10():
    """Rank returns all tickers sorted descending by score."""
    tickers = []
    for i in range(15):
        indicators = IndicatorSet(
            ticker=f"T{i}.NS", rsi=float(20 + i * 4), macd_line=0.1, macd_signal=0.0,
            macd_histogram=0.1, macd_histogram_prev=0.05,
            bb_upper=110.0, bb_middle=100.0, bb_lower=90.0,
            sma_50=102.0, sma_200=98.0, ema_20=101.0,
            vol_5d_avg=5000000, vol_20d_avg=4000000,
            last_close=95.0, log_return_std_30=0.02,
        )
        tickers.append(score_ticker(indicators, []))

    ranked = rank_tickers(tickers)
    assert len(ranked) == 15  # All results returned
    # Sorted descending
    for i in range(len(ranked) - 1):
        assert ranked[i].bullish_score >= ranked[i + 1].bullish_score
