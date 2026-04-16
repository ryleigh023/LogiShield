import uuid, time, logging
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("freightsentinel")

class TracingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        trace_id = str(uuid.uuid4())
        request.state.trace_id = trace_id
        start = time.time()
        response = await call_next(request)
        duration = round((time.time() - start) * 1000, 2)
        logger.info({
            "trace_id": trace_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration
        })
        response.headers["X-Trace-Id"] = trace_id
        return response
