"""Tests for src/rag/eval_store.py — SQLite evaluation storage."""

import pytest
import os
import asyncio
from src.rag.eval_store import init_eval_db, store_evaluation, get_latest_evaluation, get_evaluation_history
from src.rag.evaluator import EvaluationResult


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Use a temporary DB path for tests."""
    test_db = str(tmp_path / 'test_eval.db')
    monkeypatch.setattr('src.rag.eval_store.DB_PATH', test_db)
    yield test_db


@pytest.fixture
def sample_result():
    return EvaluationResult(
        timestamp='2024-01-15T10:00:00Z',
        precision_at_k=0.75,
        recall_at_k=0.65,
        mrr=0.82,
        context_relevance=0.70,
        answer_faithfulness=0.80,
        answer_relevance=0.75,
        total_queries=50,
        duration_seconds=45.2,
        tokens_consumed=5000,
        cost_usd=0.002,
    )


@pytest.mark.asyncio
async def test_init_eval_db(setup_test_db):
    await init_eval_db()
    assert os.path.exists(setup_test_db)


@pytest.mark.asyncio
async def test_store_and_retrieve(setup_test_db, sample_result):
    await init_eval_db()
    row_id = await store_evaluation(sample_result)
    assert row_id > 0

    latest = await get_latest_evaluation()
    assert latest is not None
    assert latest['precision_at_k'] == 0.75
    assert latest['mrr'] == 0.82


@pytest.mark.asyncio
async def test_evaluation_history(setup_test_db, sample_result):
    await init_eval_db()
    await store_evaluation(sample_result)

    # Store a second result
    result2 = EvaluationResult(
        timestamp='2024-01-16T10:00:00Z',
        precision_at_k=0.80,
        recall_at_k=0.70,
        mrr=0.85,
        context_relevance=0.75,
        answer_faithfulness=0.85,
        answer_relevance=0.80,
        total_queries=50,
        duration_seconds=42.0,
        tokens_consumed=4800,
        cost_usd=0.0019,
    )
    await store_evaluation(result2)

    history = await get_evaluation_history(limit=10)
    assert len(history) == 2
    # Most recent first
    assert history[0]['precision_at_k'] == 0.80


@pytest.mark.asyncio
async def test_empty_db_returns_none(setup_test_db):
    await init_eval_db()
    latest = await get_latest_evaluation()
    assert latest is None
