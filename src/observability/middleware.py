"""ObservabilityMiddleware — records request metrics and errors for every HTTP request."""

import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from src.observability.store import record_metric, record_error

logger = logging.getLogger(__name__)


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """Records request_count, request_duration_ms, and error events for every request."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000
            # Record error — await directly instead of fire-and-forget to avoid orphaned tasks
            try:
                await record_error("ERROR", "middleware", f"{request.method} {request.url.path} raised {type(e).__name__}: {e}")
                await record_metric("request_duration_ms", elapsed_ms, {"path": request.url.path, "method": request.method, "status": 500})
                await record_metric("request_count", 1, {"path": request.url.path, "method": request.method, "status": 500})
            except Exception:
                logger.debug("Failed to record observability metrics", exc_info=True)
            raise

        elapsed_ms = (time.perf_counter() - start) * 1000
        status = response.status_code
        path = request.url.path
        method = request.method

        # Record metrics — await directly to avoid orphaned asyncio tasks on shutdown
        try:
            await record_metric("request_duration_ms", elapsed_ms, {"path": path, "method": method, "status": status})
            await record_metric("request_count", 1, {"path": path, "method": method, "status": status})

            # Record warnings/errors for non-success responses
            if status >= 500:
                await record_error("ERROR", "middleware", f"{method} {path} returned {status}")
            elif status >= 400:
                await record_error("WARNING", "middleware", f"{method} {path} returned {status}")
        except Exception:
            logger.debug("Failed to record observability metrics", exc_info=True)

        return response
