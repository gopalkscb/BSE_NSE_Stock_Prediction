"""SQLite storage for RAG evaluation results."""

import os
import json
import aiosqlite
import structlog

logger = structlog.get_logger(__name__)

DB_PATH = os.path.join('data', 'rag_eval.db')


async def init_eval_db():
    """Initialize the evaluation results database."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS evaluation_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                precision_at_k REAL NOT NULL,
                recall_at_k REAL NOT NULL,
                mrr REAL NOT NULL,
                context_relevance REAL NOT NULL,
                answer_faithfulness REAL NOT NULL,
                answer_relevance REAL NOT NULL,
                total_queries INTEGER NOT NULL,
                duration_seconds REAL NOT NULL,
                tokens_consumed INTEGER DEFAULT 0,
                cost_usd REAL DEFAULT 0.0
            )
        ''')
        await db.commit()
    logger.info('eval_db_initialized', path=DB_PATH)


async def store_evaluation(result) -> int:
    """Store an evaluation result. Returns the row ID."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            '''INSERT INTO evaluation_results 
               (timestamp, precision_at_k, recall_at_k, mrr, context_relevance,
                answer_faithfulness, answer_relevance, total_queries,
                duration_seconds, tokens_consumed, cost_usd)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                result.timestamp,
                result.precision_at_k,
                result.recall_at_k,
                result.mrr,
                result.context_relevance,
                result.answer_faithfulness,
                result.answer_relevance,
                result.total_queries,
                result.duration_seconds,
                result.tokens_consumed,
                result.cost_usd,
            ),
        )
        await db.commit()
        logger.info('evaluation_stored', id=cursor.lastrowid)
        return cursor.lastrowid


async def get_latest_evaluation() -> dict | None:
    """Get the most recent evaluation result."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            'SELECT * FROM evaluation_results ORDER BY id DESC LIMIT 1'
        )
        row = await cursor.fetchone()
        if row:
            return dict(row)
    return None


async def get_evaluation_history(limit: int = 50) -> list[dict]:
    """Get evaluation history ordered by most recent first."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            'SELECT * FROM evaluation_results ORDER BY id DESC LIMIT ?',
            (limit,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_degradation_check() -> dict | None:
    """
    Compare latest two evaluations and flag >10% degradation.
    Returns None if no degradation or insufficient data.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            'SELECT * FROM evaluation_results ORDER BY id DESC LIMIT 2'
        )
        rows = await cursor.fetchall()
        if len(rows) < 2:
            return None

        latest = dict(rows[0])
        previous = dict(rows[1])

        degradations = []
        metrics = ['precision_at_k', 'recall_at_k', 'mrr', 'answer_faithfulness', 'answer_relevance']
        
        for metric in metrics:
            prev_val = previous.get(metric, 0)
            curr_val = latest.get(metric, 0)
            if prev_val > 0:
                drop = (prev_val - curr_val) / prev_val
                if drop > 0.10:  # >10% drop
                    degradations.append({
                        'metric': metric,
                        'previous': round(prev_val, 4),
                        'current': round(curr_val, 4),
                        'drop_pct': round(drop * 100, 1),
                    })

        if degradations:
            return {
                'status': 'degraded',
                'degradations': degradations,
                'latest_timestamp': latest.get('timestamp'),
            }
        return None
