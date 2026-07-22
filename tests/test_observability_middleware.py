"""Smoke test for observability middleware — verifies requests are recorded."""

import pytest
from httpx import AsyncClient, ASGITransport
from src.api.main import app
from src.observability.store import get_metrics, init_db


@pytest.fixture(autouse=True)
async def setup_db(tmp_path, monkeypatch):
    """Use a temporary DB for middleware tests."""
    db_path = str(tmp_path / "test_obs.db")
    import src.observability.store as store_module
    monkeypatch.setattr(store_module, "DB_PATH", db_path)
    await init_db()


@pytest.mark.asyncio
async def test_middleware_records_request_count(setup_db):
    """Making a request records a request_count metric."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get("/health")

    # Give async tasks a moment to complete
    import asyncio
    await asyncio.sleep(0.1)

    metrics = await get_metrics(limit=10)
    metric_names = [m["metric_name"] for m in metrics]
    assert "request_count" in metric_names
