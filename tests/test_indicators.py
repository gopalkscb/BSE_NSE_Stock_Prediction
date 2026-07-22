"""Smoke test for src/features/indicator_calculator.py."""

import numpy as np
import pandas as pd
from src.features.indicator_calculator import compute_indicators


def test_compute_indicators_all_finite():
    """Synthetic 252-row DataFrame produces a finite IndicatorSet."""
    np.random.seed(42)
    dates = pd.date_range("2023-01-01", periods=252, freq="B")
    close = pd.Series(np.cumsum(np.random.randn(252)) + 100, index=dates)
    close = close.clip(lower=1)  # Ensure positive prices

    df = pd.DataFrame({
        "Open": close * (1 + np.random.uniform(-0.02, 0.02, 252)),
        "High": close * (1 + np.random.uniform(0, 0.03, 252)),
        "Low": close * (1 - np.random.uniform(0, 0.03, 252)),
        "Close": close,
        "Volume": np.random.randint(100000, 10000000, 252),
    }, index=dates)

    result = compute_indicators(df, "TEST.NS")

    # All fields should be finite
    assert np.isfinite(result.rsi)
    assert np.isfinite(result.macd_line)
    assert np.isfinite(result.macd_signal)
    assert np.isfinite(result.macd_histogram)
    assert np.isfinite(result.bb_upper)
    assert np.isfinite(result.bb_middle)
    assert np.isfinite(result.bb_lower)
    assert np.isfinite(result.sma_50)
    assert np.isfinite(result.sma_200)
    assert np.isfinite(result.ema_20)
    assert np.isfinite(result.vol_5d_avg)
    assert np.isfinite(result.vol_20d_avg)
    assert np.isfinite(result.last_close)
    assert np.isfinite(result.log_return_std_30)

    # RSI in valid range
    assert 0 <= result.rsi <= 100

    # Bollinger bands ordered
    assert result.bb_upper > result.bb_middle > result.bb_lower
