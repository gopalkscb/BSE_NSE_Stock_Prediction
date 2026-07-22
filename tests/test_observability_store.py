"""Tests for src/observability/store.py — SQLite observability store."""

import os
import pytest
import asyncio
from pathlib import Path

# Use a temporary DB path for tests
TEST_DB_PATH = "data/test_observability.db"


@pytest.fixture(autouse=True)
def set_test_db(tmp_path, monkeypatch):
    """Use a temporary database for each test."""
    db_path = str(tmp_path / "test_observability.db")
    monkeypatch.setenv("OBSERVABILITY_DB_PATH", db_path)
    # Reload the module-level DB_PATH
    import src.observability.store as store_module
    monkeypatch.setattr(store_module, "DB_PATH", db_path)
    yield db_path
    # Cleanup handled by tmp_path fixture


@pytest.fixture
async def initialized_db(set_test_db):
    """Initialize the DB before the test."""
    from src.observability.store import init_db
    await init_db()
    return set_test_db


@pytest.mark.asyncio
async def test_init_db_creates_tables(set_test_db):
    """Verify all 3 tables exist after init_db()."""
    import aiosqlite
    from src.observability.store import init_db

    await init_db()

    async with aiosqlite.connect(set_test_db) as db:
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [row[0] for row in await cursor.fetchall()]

    assert "error_log" in tables
    assert "metrics" in tables
    assert "ticker_health" in tables


@pytest.mark.asyncio
async def test_record_metric_and_retrieve(initialized_db):
    """Insert a metric and verify get_metrics returns it with correct fields."""
    from src.observability.store import record_metric, get_metrics

    await record_metric("request_count", 1.0, {"path": "/api/v1/analyze"})

    results = await get_metrics(limit=10)
    assert len(results) == 1
    assert results[0]["metric_name"] == "request_count"
    assert results[0]["metric_value"] == 1.0
    assert results[0]["labels"] == {"path": "/api/v1/analyze"}
    assert results[0]["timestamp"] is not None
    assert results[0]["id"] is not None


@pytest.mark.asyncio
async def test_record_error_and_retrieve(initialized_db):
    """Insert an error and verify get_errors returns it."""
    from src.observability.store import record_error, get_errors

    await record_error(
        "ERROR",
        "data.fetch_market_data",
        "Fetch failed for RELIANCE.NS",
        {"ticker": "RELIANCE.NS", "exception": "TimeoutError"},
    )

    entries, total_count = await get_errors(limit=10, offset=0)
    assert total_count == 1
    assert len(entries) == 1
    assert entries[0]["level"] == "ERROR"
    assert entries[0]["source_module"] == "data.fetch_market_data"
    assert entries[0]["message"] == "Fetch failed for RELIANCE.NS"
    assert entries[0]["details"]["ticker"] == "RELIANCE.NS"


@pytest.mark.asyncio
async def test_get_errors_pagination(initialized_db):
    """Insert 10 errors, get with limit=5 offset=5 returns 5 entries."""
    from src.observability.store import record_error, get_errors

    for i in range(10):
        await record_error("ERROR", "test_module", f"Error {i}")

    entries, total_count = await get_errors(limit=5, offset=5)
    assert total_count == 10
    assert len(entries) == 5


@pytest.mark.asyncio
async def test_get_errors_level_filter(initialized_db):
    """Filter by ERROR excludes WARNING entries."""
    from src.observability.store import record_error, get_errors

    await record_error("ERROR", "module_a", "An error occurred")
    await record_error("WARNING", "module_b", "A warning occurred")
    await record_error("ERROR", "module_c", "Another error")

    entries, total_count = await get_errors(limit=50, offset=0, level="ERROR")
    assert total_count == 2
    assert len(entries) == 2
    assert all(e["level"] == "ERROR" for e in entries)

    entries, total_count = await get_errors(limit=50, offset=0, level="WARNING")
    assert total_count == 1
    assert len(entries) == 1
    assert entries[0]["level"] == "WARNING"


@pytest.mark.asyncio
async def test_update_ticker_health_new_ticker(initialized_db):
    """Upsert creates new row with correct defaults."""
    from src.observability.store import update_ticker_health, get_ticker_health

    await update_ticker_health("RELIANCE.NS", success=True, confidence_score=75.0)

    records = await get_ticker_health()
    assert len(records) == 1
    assert records[0]["ticker"] == "RELIANCE.NS"
    assert records[0]["total_requests"] == 1
    assert records[0]["total_failures"] == 0
    assert records[0]["last_success_at"] is not None
    assert records[0]["last_failure_at"] is None
    assert records[0]["avg_confidence_score"] == 75.0
    assert records[0]["low_confidence_count"] == 0


@pytest.mark.asyncio
async def test_update_ticker_health_existing_increments(initialized_db):
    """Second call increments counters correctly."""
    from src.observability.store import update_ticker_health, get_ticker_health

    await update_ticker_health("TCS.NS", success=True, confidence_score=80.0)
    await update_ticker_health("TCS.NS", success=True, confidence_score=60.0)

    records = await get_ticker_health()
    assert len(records) == 1
    assert records[0]["ticker"] == "TCS.NS"
    assert records[0]["total_requests"] == 2
    assert records[0]["total_failures"] == 0


@pytest.mark.asyncio
async def test_update_ticker_health_failure_records_reason(initialized_db):
    """Failure records the failure_reason and updates failure counters."""
    from src.observability.store import update_ticker_health, get_ticker_health

    await update_ticker_health(
        "INVALID.NS", success=False, failure_reason="insufficient_data"
    )

    records = await get_ticker_health()
    assert len(records) == 1
    assert records[0]["ticker"] == "INVALID.NS"
    assert records[0]["total_requests"] == 1
    assert records[0]["total_failures"] == 1
    assert records[0]["last_failure_reason"] == "insufficient_data"
    assert records[0]["last_failure_at"] is not None
    assert records[0]["failure_rate"] == 100.0


@pytest.mark.asyncio
async def test_get_metric_summary_aggregation(initialized_db):
    """Insert known values and verify summary math."""
    from src.observability.store import (
        record_metric,
        record_error,
        update_ticker_health,
        get_metric_summary,
    )

    # Record some metrics
    await record_metric("request_count", 1)
    await record_metric("request_count", 1)
    await record_metric("request_count", 1)
    await record_metric("request_duration_ms", 100.0)
    await record_metric("request_duration_ms", 200.0)
    await record_metric("cache_hit", 1)
    await record_metric("cache_hit", 1)
    await record_metric("cache_miss", 1)

    # Record errors
    await record_error("ERROR", "test", "Error 1")
    await record_error("WARNING", "test", "Warning 1")
    await record_error("WARNING", "test", "Warning 2")

    # Record ticker health
    await update_ticker_health("A.NS", success=True)
    await update_ticker_health("B.NS", success=False, failure_reason="timeout")
    await update_ticker_health("C.NS", success=True)

    summary = await get_metric_summary()
    assert summary["total_requests"] == 3
    assert summary["avg_latency_ms"] == 150.0
    assert summary["cache_hits"] == 2
    assert summary["cache_misses"] == 1
    assert summary["total_errors"] == 1
    assert summary["total_warnings"] == 2
    # 1 failure out of 3 total requests = 33.33%
    assert abs(summary["failed_ticker_rate"] - 33.33) < 0.01


@pytest.mark.asyncio
async def test_get_ticker_health_sorted_by_failure_rate(initialized_db):
    """Ticker with higher failure rate appears first."""
    from src.observability.store import update_ticker_health, get_ticker_health

    # Ticker A: 1 success, 0 failures → 0% failure
    await update_ticker_health("A.NS", success=True)

    # Ticker B: 1 failure out of 1 → 100% failure
    await update_ticker_health("B.NS", success=False, failure_reason="timeout")

    # Ticker C: 1 success, 1 failure out of 2 → 50% failure
    await update_ticker_health("C.NS", success=True)
    await update_ticker_health("C.NS", success=False, failure_reason="error")

    records = await get_ticker_health()
    assert len(records) == 3
    # Should be sorted: B (100%), C (50%), A (0%)
    assert records[0]["ticker"] == "B.NS"
    assert records[0]["failure_rate"] == 100.0
    assert records[1]["ticker"] == "C.NS"
    assert records[1]["failure_rate"] == 50.0
    assert records[2]["ticker"] == "A.NS"
    assert records[2]["failure_rate"] == 0.0
