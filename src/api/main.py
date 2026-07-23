"""FastAPI application factory — entry point for the Bullish Stock Predictor."""

import os
import time
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()  # Load .env file

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import analyze, ticker
from src.observability.store import init_db

_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize databases on startup, start RAG scheduler."""
    await init_db()
    
    # Initialize RAG evaluation DB and seed if empty
    try:
        from src.rag.eval_store import init_eval_db
        await init_eval_db()
        # Seed with baseline data if no evaluations exist
        from src.rag.seed_eval import seed_evaluations
        seed_evaluations()
    except Exception:
        pass  # Non-critical if RAG deps not installed
    
    # Start RAG pipeline scheduler (if enabled)
    orchestrator = None
    try:
        from src.rag.orchestrator import get_orchestrator
        orchestrator = get_orchestrator()
        orchestrator.start_scheduler()
    except Exception:
        pass  # Non-critical if RAG deps not installed
    
    yield
    
    # Shutdown scheduler
    if orchestrator:
        try:
            orchestrator.stop_scheduler()
        except Exception:
            pass


def create_app() -> FastAPI:
    """Factory that wires up CORS, routes, and middleware."""
    app = FastAPI(
        title="Bullish Stock Predictor",
        version="4.0.0",
        description="BSE/NSE stock screener with RAG-powered intelligence. 11 indicators, hybrid retrieval, AI explanations.",
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

    # Core routes (v1)
    app.include_router(analyze.router, tags=["analyze"])
    app.include_router(ticker.router, tags=["ticker"])

    # Intraday route (Alpha Vantage)
    from src.api.routes import intraday
    app.include_router(intraday.router, tags=["intraday"])

    # Observability routes
    from src.api.routes import observability
    app.include_router(observability.router, tags=["observability"])

    # RAG routes (v4)
    try:
        from src.api.routes import rag
        app.include_router(rag.router, tags=["rag"])
    except ImportError:
        pass  # RAG deps not installed

    # Observability middleware
    from src.observability.middleware import ObservabilityMiddleware
    app.add_middleware(ObservabilityMiddleware)

    return app


app = create_app()
