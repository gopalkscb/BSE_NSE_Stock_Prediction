"""Smoke tests for src/data/fetch_market_data.py."""

from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np
from src.data.fetch_market_data import fetch_ticker, fetch_batch, apply_exchange_suffix, FetchResult


def test_apply_exchange_suffix_idempotent():
    """Tickers with .NS or .BO suffix are returned unchanged."""
    assert apply_exchange_suffix("RELIANCE.NS") == "RELIANCE.NS"
    assert apply_exchange_suffix("500325.BO") == "500325.BO"
    assert apply_exchange_suffix("PLAIN") == "PLAIN"


@patch("yfinance.download")
def test_fetch_ticker_insufficient_data(mock_download):
    """Fewer than 50 rows returns insufficient_data status."""
    # Mock yfinance returning only 30 rows
    mock_df = pd.DataFrame(
        {"Open": np.random.rand(30), "High": np.random.rand(30),
         "Low": np.random.rand(30), "Close": np.random.rand(30),
         "Volume": np.random.randint(1000, 100000, 30)},
        index=pd.date_range("2024-01-01", periods=30)
    )
    mock_download.return_value = mock_df

    result = fetch_ticker("TEST.NS")
    assert result.status == "insufficient_data"
    assert result.df is None


@patch("yfinance.download")
def test_fetch_ticker_ok(mock_download):
    """252 rows returns ok status with DataFrame."""
    mock_df = pd.DataFrame(
        {"Open": np.random.rand(252), "High": np.random.rand(252),
         "Low": np.random.rand(252), "Close": np.random.rand(252),
         "Volume": np.random.randint(1000, 100000, 252)},
        index=pd.date_range("2023-01-01", periods=252)
    )
    mock_download.return_value = mock_df

    result = fetch_ticker("RELIANCE.NS")
    assert result.status == "ok"
    assert result.df is not None
    assert len(result.df) == 252


@patch("yfinance.download")
def test_fetch_ticker_exception(mock_download):
    """Exception returns failed status."""
    mock_download.side_effect = Exception("Network error")

    result = fetch_ticker("BAD.NS")
    assert result.status == "failed"
    assert "Network error" in result.error
