"""
SQLite-backed observability store for metrics, errors, and ticker health.

Provides persistent storage that survives server restarts.
All functions are async and use aiosqlite for non-blocking DB access.
"""

import json
import os
import aiosqlite
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = os.environ.get("OBSERVABILITY_DB_PATH", "data/observability.db")

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    labels TEXT
);

CREATE TABLE IF NOT EXISTS error_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    source_module TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT
);

CREATE TABLE IF NOT EXISTS ticker_health (
    ticker TEXT PRIMARY KEY,
    total_requests INTEGER DEFAULT 0,
    total_failures INTEGER DEFAULT 0,
    last_failure_reason TEXT,
    last_success_at TEXT,
    last_failure_at TEXT,
    avg_confidence_score REAL,
    low_confidence_count INTEGER DEFAULT 0
);
"""


def _now_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


async def init_db() -> None:
    """Create database file and tables if they don't exist."""
    db_dir = Path(DB_PATH).parent
    db_dir.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(_SCHEMA_SQL)
        await db.commit()


async def record_metric(name: str, value: float, labels: dict | None = None) -> None:
    """Insert a metric event with current ISO 8601 timestamp."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO metrics (timestamp, metric_name, metric_value, labels) VALUES (?, ?, ?, ?)",
            (_now_iso(), name, value, json.dumps(labels) if labels else None),
        )
        await db.commit()


async def record_error(
    level: str, source_module: str, message: str, details: dict | None = None
) -> None:
    """Insert an error/warning log entry."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO error_log (timestamp, level, source_module, message, details) VALUES (?, ?, ?, ?, ?)",
            (
                _now_iso(),
                level,
                source_module,
                message,
                json.dumps(details) if details else None,
            ),
        )
        await db.commit()


async def update_ticker_health(
    ticker: str,
    success: bool,
    confidence_score: float | None = None,
    failure_reason: str | None = None,
) -> None:
    """Upsert ticker health record. Increments counters and updates timestamps."""
    now = _now_iso()

    async with aiosqlite.connect(DB_PATH) as db:
        # Check if ticker exists
        cursor = await db.execute(
            "SELECT total_requests, total_failures, avg_confidence_score, low_confidence_count FROM ticker_health WHERE ticker = ?",
            (ticker,),
        )
        row = await cursor.fetchone()

        if row is None:
            # Insert new record
            avg_conf = confidence_score if confidence_score is not None else None
            low_conf_count = 1 if confidence_score is not None and confidence_score < 50 else 0
            await db.execute(
                """INSERT INTO ticker_health
                   (ticker, total_requests, total_failures, last_failure_reason,
                    last_success_at, last_failure_at, avg_confidence_score, low_confidence_count)
                   VALUES (?, 1, ?, ?, ?, ?, ?, ?)""",
                (
                    ticker,
                    0 if success else 1,
                    failure_reason if not success else None,
                    now if success else None,
                    now if not success else None,
                    avg_conf,
                    low_conf_count,
                ),
            )
        else:
            total_requests, total_failures, avg_conf, low_conf_count = row
            new_total_requests = total_requests + 1
            new_total_failures = total_failures + (0 if success else 1)

            # Update average confidence score (running average)
            if confidence_score is not None:
                if avg_conf is not None:
                    # Running average: new_avg = old_avg + (new_value - old_avg) / count
                    # Use total_requests as count of confidence updates
                    new_avg_conf = avg_conf + (confidence_score - avg_conf) / new_total_requests
                else:
                    new_avg_conf = confidence_score
                new_low_conf = low_conf_count + (1 if confidence_score < 50 else 0)
            else:
                new_avg_conf = avg_conf
                new_low_conf = low_conf_count

            if success:
                await db.execute(
                    """UPDATE ticker_health SET
                       total_requests = ?,
                       last_success_at = ?,
                       avg_confidence_score = ?,
                       low_confidence_count = ?
                       WHERE ticker = ?""",
                    (new_total_requests, now, new_avg_conf, new_low_conf, ticker),
                )
            else:
                await db.execute(
                    """UPDATE ticker_health SET
                       total_requests = ?,
                       total_failures = ?,
                       last_failure_reason = ?,
                       last_failure_at = ?,
                       avg_confidence_score = ?,
                       low_confidence_count = ?
                       WHERE ticker = ?""",
                    (
                        new_total_requests,
                        new_total_failures,
                        failure_reason,
                        now,
                        new_avg_conf,
                        new_low_conf,
                        ticker,
                    ),
                )

        await db.commit()


async def get_metrics(limit: int = 100) -> list[dict]:
    """Return most recent metric events, newest first."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, timestamp, metric_name, metric_value, labels FROM metrics ORDER BY id DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return [
            {
                "id": row["id"],
                "timestamp": row["timestamp"],
                "metric_name": row["metric_name"],
                "metric_value": row["metric_value"],
                "labels": json.loads(row["labels"]) if row["labels"] else None,
            }
            for row in rows
        ]


async def get_errors(
    limit: int = 50, offset: int = 0, level: str | None = None
) -> tuple[list[dict], int]:
    """Return paginated error log entries. Returns (entries, total_count)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Get total count
        if level:
            count_cursor = await db.execute(
                "SELECT COUNT(*) as cnt FROM error_log WHERE level = ?", (level,)
            )
        else:
            count_cursor = await db.execute("SELECT COUNT(*) as cnt FROM error_log")
        count_row = await count_cursor.fetchone()
        total_count = count_row["cnt"]

        # Get paginated entries
        if level:
            cursor = await db.execute(
                "SELECT * FROM error_log WHERE level = ? ORDER BY id DESC LIMIT ? OFFSET ?",
                (level, limit, offset),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM error_log ORDER BY id DESC LIMIT ? OFFSET ?",
                (limit, offset),
            )
        rows = await cursor.fetchall()

        entries = [
            {
                "id": row["id"],
                "timestamp": row["timestamp"],
                "level": row["level"],
                "source_module": row["source_module"],
                "message": row["message"],
                "details": json.loads(row["details"]) if row["details"] else None,
            }
            for row in rows
        ]

        return entries, total_count


async def get_ticker_health() -> list[dict]:
    """Return all ticker health records sorted by failure rate descending."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT ticker, total_requests, total_failures, last_failure_reason,
                      last_success_at, last_failure_at, avg_confidence_score, low_confidence_count
               FROM ticker_health
               ORDER BY CAST(total_failures AS REAL) / MAX(total_requests, 1) DESC"""
        )
        rows = await cursor.fetchall()

        return [
            {
                "ticker": row["ticker"],
                "total_requests": row["total_requests"],
                "total_failures": row["total_failures"],
                "failure_rate": (row["total_failures"] / max(row["total_requests"], 1)) * 100,
                "last_failure_reason": row["last_failure_reason"],
                "last_success_at": row["last_success_at"],
                "last_failure_at": row["last_failure_at"],
                "avg_confidence_score": row["avg_confidence_score"],
                "low_confidence_count": row["low_confidence_count"],
            }
            for row in rows
        ]


async def get_metric_summary() -> dict:
    """Return aggregated metric summary."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Total requests
        cursor = await db.execute(
            "SELECT COALESCE(SUM(metric_value), 0) as total FROM metrics WHERE metric_name = 'request_count'"
        )
        row = await cursor.fetchone()
        total_requests = int(row["total"])

        # Average latency
        cursor = await db.execute(
            "SELECT COALESCE(AVG(metric_value), 0) as avg_val FROM metrics WHERE metric_name = 'request_duration_ms'"
        )
        row = await cursor.fetchone()
        avg_latency_ms = round(float(row["avg_val"]), 2)

        # Cache hits
        cursor = await db.execute(
            "SELECT COALESCE(SUM(metric_value), 0) as total FROM metrics WHERE metric_name = 'cache_hit'"
        )
        row = await cursor.fetchone()
        cache_hits = int(row["total"])

        # Cache misses
        cursor = await db.execute(
            "SELECT COALESCE(SUM(metric_value), 0) as total FROM metrics WHERE metric_name = 'cache_miss'"
        )
        row = await cursor.fetchone()
        cache_misses = int(row["total"])

        # Total errors
        cursor = await db.execute(
            "SELECT COUNT(*) as cnt FROM error_log WHERE level = 'ERROR'"
        )
        row = await cursor.fetchone()
        total_errors = int(row["cnt"])

        # Total warnings
        cursor = await db.execute(
            "SELECT COUNT(*) as cnt FROM error_log WHERE level = 'WARNING'"
        )
        row = await cursor.fetchone()
        total_warnings = int(row["cnt"])

        # Failed ticker rate
        cursor = await db.execute(
            """SELECT
                 COALESCE(SUM(total_failures), 0) as failures,
                 COALESCE(SUM(total_requests), 0) as requests
               FROM ticker_health"""
        )
        row = await cursor.fetchone()
        total_ticker_failures = int(row["failures"])
        total_ticker_requests = int(row["requests"])
        failed_ticker_rate = (
            (total_ticker_failures / total_ticker_requests * 100)
            if total_ticker_requests > 0
            else 0.0
        )

        return {
            "total_requests": total_requests,
            "avg_latency_ms": avg_latency_ms,
            "cache_hits": cache_hits,
            "cache_misses": cache_misses,
            "total_errors": total_errors,
            "total_warnings": total_warnings,
            "failed_ticker_rate": round(failed_ticker_rate, 2),
        }
