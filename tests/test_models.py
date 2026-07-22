"""Smoke tests for src/api/models.py — Pydantic model validation."""

import pytest
from pydantic import ValidationError
from src.api.models import AnalyzeRequest, ScoredTicker, SubScores


def test_analyze_request_valid():
    """Valid AnalyzeRequest with 1-200 tickers passes validation."""
    req = AnalyzeRequest(tickers=["RELIANCE.NS", "TCS.NS"])
    assert len(req.tickers) == 2


def test_analyze_request_empty_tickers_fails():
    """Empty tickers list fails validation."""
    with pytest.raises(ValidationError):
        AnalyzeRequest(tickers=[])


def test_analyze_request_too_many_tickers_fails():
    """More than 500 tickers fails validation."""
    with pytest.raises(ValidationError):
        AnalyzeRequest(tickers=[f"TICK{i}.NS" for i in range(501)])


def test_scored_ticker_valid():
    """Valid ScoredTicker passes."""
    ticker = ScoredTicker(
        ticker="RELIANCE.NS",
        bullish_score=75,
        confidence="High",
        sub_scores=SubScores(rsi=20, macd=15, bollinger=12, moving_avg=20, volume=8),
        rsi_value=28.5,
        macd_signal_label="bullish",
        bb_signal_label="oversold",
        ma_signal_label="golden_cross",
        volume_signal_label="normal",
        projected_lower=2400.0,
        projected_upper=2800.0,
    )
    assert ticker.bullish_score == 75
    assert ticker.confidence == "High"
