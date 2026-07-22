"""Timing utilities for pipeline instrumentation."""

import time
import asyncio
import functools
from src.observability.store import record_metric


def timed(metric_name: str):
    """Sync decorator that records execution time as a metric (fire-and-forget)."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            result = func(*args, **kwargs)
            elapsed_ms = (time.perf_counter() - start) * 1000
            # Schedule metric recording without blocking
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(record_metric(metric_name, elapsed_ms, {"function": func.__name__}))
                else:
                    loop.run_until_complete(record_metric(metric_name, elapsed_ms, {"function": func.__name__}))
            except RuntimeError:
                pass  # No event loop available — skip recording
            return result
        return wrapper
    return decorator


def timed_async(metric_name: str):
    """Async decorator that records execution time as a metric."""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.perf_counter()
            result = await func(*args, **kwargs)
            elapsed_ms = (time.perf_counter() - start) * 1000
            await record_metric(metric_name, elapsed_ms, {"function": func.__name__})
            return result
        return wrapper
    return decorator


class TimingContext:
    """Context manager for ad-hoc timing blocks.

    Usage:
        with TimingContext("compute_rsi_ms"):
            result = compute_rsi(close)
    """

    def __init__(self, metric_name: str):
        self.metric_name = metric_name
        self.start = 0.0
        self.elapsed_ms = 0.0

    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, *exc):
        self.elapsed_ms = (time.perf_counter() - self.start) * 1000
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(record_metric(self.metric_name, self.elapsed_ms))
            else:
                loop.run_until_complete(record_metric(self.metric_name, self.elapsed_ms))
        except RuntimeError:
            pass
        return False
