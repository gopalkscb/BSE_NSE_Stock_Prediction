"""POST /api/v1/analyze — main analysis endpoint."""

import logging
from fastapi import APIRouter, HTTPException
from src.api.models import AnalyzeRequest, AnalyzeResponse, FailedTicker
from src.data.fetch_market_data import fetch_batch
from src.features.indicator_calculator import compute_indicators
from src.models.bullish_scorer import score_ticker, rank_tickers
from src.api import cache
from data.tickers.bse_tickers import resolve_bse_ticker, SYMBOL_TO_SCRIP

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/api/v1/analyze",
    response_model=AnalyzeResponse,
    summary="Analyze stock tickers",
    description=(
        "Fetch OHLCV data, compute indicators, score, and rank top-10 bullish stocks. "
        "BSE tickers using symbol names (e.g. TCS.BO) are auto-resolved to scrip codes (e.g. 532540.BO)."
    ),
)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    1. Validate tickers (non-empty, ≤20 chars, 1-200 items).
    2. Auto-resolve BSE symbol names to scrip codes.
    3. Fetch OHLCV, compute indicators, score each ticker.
    4. Sort top-10, store in cache, return results + failed list.
    """
    # Validate and resolve individual tickers
    valid_tickers = []
    failed: list[FailedTicker] = []
    resolved_map: dict[str, str] = {}  # resolved_ticker → original_input

    for ticker in request.tickers:
        ticker = ticker.strip().upper()
        if not ticker:
            continue
        if len(ticker) > 20:
            failed.append(FailedTicker(ticker=ticker, reason="Ticker exceeds 20 characters"))
            continue

        # Auto-resolve BSE symbol names (e.g. TCS.BO → 532540.BO)
        resolved, was_resolved = resolve_bse_ticker(ticker)
        if was_resolved:
            logger.info(f"Auto-resolved BSE ticker: {ticker} → {resolved}")
            resolved_map[resolved] = ticker
        valid_tickers.append(resolved)

    if not valid_tickers:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "No valid tickers provided. Use format: RELIANCE.NS (NSE) or 532540.BO (BSE scrip code).",
                "hint": "BSE tickers use numeric scrip codes (e.g. 532540.BO for TCS). Common symbols like TCS.BO are auto-resolved.",
                "failed": [f.model_dump() for f in failed],
            },
        )

    # Fetch data
    fetch_results = fetch_batch(valid_tickers)

    # Process each successful fetch
    scored = []
    for result in fetch_results:
        if result.status != "ok":
            # Build a helpful error message
            original_input = resolved_map.get(result.ticker, result.ticker)
            reason = _build_failure_reason(result.ticker, original_input, result.error or result.status)
            failed.append(FailedTicker(ticker=original_input, reason=reason))
            continue

        try:
            indicators = compute_indicators(result.df, result.ticker)
            # Get last 90 days of OHLCV for detail view
            ohlcv_90d = (
                result.df.tail(90)
                .reset_index()
                .assign(date=lambda x: x.iloc[:, 0].astype(str))
                .to_dict("records")
            )
            ticker_result = score_ticker(indicators, ohlcv_90d)
            scored.append(ticker_result)
            cache.put(result.ticker, ticker_result)
            # Also cache under original symbol name if resolved
            if result.ticker in resolved_map:
                cache.put(resolved_map[result.ticker], ticker_result)
        except Exception as e:
            original_input = resolved_map.get(result.ticker, result.ticker)
            failed.append(FailedTicker(ticker=original_input, reason=f"Analysis error: {str(e)}"))

    if not scored:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "All tickers failed to produce results.",
                "hint": _build_all_failed_hint(valid_tickers, failed),
                "failed": [f.model_dump() for f in failed],
            },
        )

    # Rank top 10
    ranked = rank_tickers(scored)

    return AnalyzeResponse(results=ranked, failed=failed)


def _build_failure_reason(resolved_ticker: str, original_input: str, raw_error: str) -> str:
    """Build a user-friendly failure reason with hints."""
    if raw_error == "insufficient_data":
        return f"Insufficient data (need 50+ trading days). Ticker may be newly listed or delisted."

    if "No data found" in raw_error or "failed" in raw_error.lower():
        # Check if it's a symbol-style BSE ticker that wasn't resolved
        if original_input.endswith(".BO") and not original_input[:-3].isdigit():
            symbol = original_input[:-3]
            if symbol not in SYMBOL_TO_SCRIP:
                return (
                    f"No data found for '{original_input}'. BSE tickers require numeric scrip codes "
                    f"(e.g. 532540.BO for TCS). Symbol '{symbol}' is not in our auto-resolve list. "
                    f"Find the scrip code at bseindia.com."
                )
        return f"No data found. Verify the ticker exists on Yahoo Finance (finance.yahoo.com)."

    return raw_error


def _build_all_failed_hint(tickers: list[str], failed: list[FailedTicker]) -> str:
    """Build a helpful hint when all tickers fail."""
    bse_symbols = [t for t in tickers if t.endswith(".BO") and not t[:-3].isdigit()]
    if bse_symbols:
        return (
            "BSE tickers must use numeric scrip codes (e.g. 532540.BO), not symbol names. "
            "Common symbols like TCS.BO, RELIANCE.BO are auto-resolved, but others need "
            "the scrip code. Use NSE format (e.g. TCS.NS) or find BSE scrip codes at bseindia.com."
        )
    return (
        "Verify tickers exist on Yahoo Finance. NSE format: SYMBOL.NS (e.g. TCS.NS). "
        "BSE format: SCRIPCODE.BO (e.g. 532540.BO)."
    )
