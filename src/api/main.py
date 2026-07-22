"""FastAPI application factory — entry point for the Bullish Stock Predictor."""

import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import analyze, ticker
from src.observability.store import init_db

_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize observability DB on startup."""
    await init_db()
    yield


def create_app() -> FastAPI:
    """Factory that wires up CORS, routes, and middleware."""
    app = FastAPI(
        title="Bullish Stock Predictor",
        version="1.0.0",
        description="Analyses BSE/NSE stock tickers using 5 technical indicators and ranks the top 10 most bullish stocks.",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS
    frontend_origin = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health endpoint
    @app.get("/health", summary="Health check", tags=["system"])
    async def health():
        return {"status": "ok", "uptime_seconds": round(time.time() - _start_time, 1)}

    # Core routes
    app.include_router(analyze.router, tags=["analyze"])
    app.include_router(ticker.router, tags=["ticker"])

    # Observability routes
    from src.api.routes import observability
    app.include_router(observability.router, tags=["observability"])

    # Observability middleware
    from src.observability.middleware import ObservabilityMiddleware
    app.add_middleware(ObservabilityMiddleware)

    return app


app = create_app()
