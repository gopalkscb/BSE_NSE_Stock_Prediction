"""Smoke tests for FastAPI routes."""

import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from src.api.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_health_endpoint():
    """GET /health returns 200 with status ok."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "uptime_seconds" in data


@pytest.mark.asyncio
async def test_analyze_empty_tickers():
    """POST /api/v1/analyze with empty tickers returns 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/analyze", json={"tickers": []})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_ticker_not_in_cache():
    """GET /api/v1/ticker/UNKNOWN returns 404."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/ticker/UNKNOWN.NS")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_swagger_docs_available():
    """GET /docs returns 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/docs")
    assert response.status_code == 200
