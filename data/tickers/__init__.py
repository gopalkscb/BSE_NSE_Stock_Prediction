"""
Ticker package — provides yfinance-validated NSE and BSE ticker lists.

All tickers have been validated to return data from yfinance (2026-07-22).

Quick usage:
    from data.tickers import NSE_TICKERS, BSE_TICKERS
    from data.tickers import NIFTY_50, NIFTY_BANK, NIFTY_IT, NIFTY_PHARMA, NIFTY_AUTO
    from data.tickers import SENSEX_30
"""

from data.tickers.nse_tickers import (
    NSE_TICKERS,
    NIFTY_50,
    NIFTY_BANK,
    NIFTY_IT,
    NIFTY_PHARMA,
    NIFTY_AUTO,
)

from data.tickers.bse_tickers import (
    BSE_TICKERS,
    SENSEX_30,
    NAME_MAP,
    SYMBOL_TO_SCRIP,
    get_ticker_name,
    resolve_bse_ticker,
)

__all__ = [
    "NSE_TICKERS",
    "NIFTY_50",
    "NIFTY_BANK",
    "NIFTY_IT",
    "NIFTY_PHARMA",
    "NIFTY_AUTO",
    "BSE_TICKERS",
    "SENSEX_30",
    "NAME_MAP",
    "SYMBOL_TO_SCRIP",
    "get_ticker_name",
    "resolve_bse_ticker",
]
