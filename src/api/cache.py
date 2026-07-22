"""In-memory session cache for scored ticker results."""

import threading
from typing import Optional
from src.api.models import ScoredTicker

_session_cache: dict[str, ScoredTicker] = {}
_lock = threading.Lock()


def get(ticker: str) -> Optional[ScoredTicker]:
    """Thread-safe cache read. Returns None on miss."""
    return _session_cache.get(ticker)


def put(ticker: str, result: ScoredTicker) -> None:
    """Thread-safe cache write."""
    with _lock:
        _session_cache[ticker] = result


def clear() -> None:
    """Clear all cached entries."""
    with _lock:
        _session_cache.clear()
