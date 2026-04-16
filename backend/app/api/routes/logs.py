"""
Live log tail endpoint.

We read from an in-memory ring buffer that the custom `freightsentinel` logger
writes into. In production you'd point Grafana at Loki/Elasticsearch instead
(both are wired in the compose stack) — this endpoint exists so the UI can
render a live log stream without a log-aggregator round-trip.
"""
from collections import deque
import logging
import os
import threading
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None

from app.auth.rbac import get_current_user

router = APIRouter()

_RING_MAX = 500
_RING: deque[dict] = deque(maxlen=_RING_MAX)
_LOCK = threading.Lock()


class RingHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = record.getMessage()
            if isinstance(record.msg, dict):
                # Structured logs land here (from TracingMiddleware).
                d = record.msg
                trace_id = str(d.get("trace_id", ""))
                message = f"{d.get('method','')} {d.get('path','')} → {d.get('status','')} in {d.get('duration_ms','?')}ms"
            else:
                trace_id = getattr(record, "trace_id", "")
                message = msg
            row = {
                "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
                "level": record.levelname.lower(),
                "service": "backend",
                "trace_id": trace_id,
                "message": message,
            }
            with _LOCK:
                _RING.append(row)
        except Exception:  # keep logging safe
            pass


def install_ring_handler() -> None:
    logger = logging.getLogger("freightsentinel")
    if any(isinstance(h, RingHandler) for h in logger.handlers):
        return
    logger.addHandler(RingHandler())
    logger.setLevel(logging.INFO)


# Worker logs land in Redis via `worker_log_push` — we drain them on read.
WORKER_LOG_KEY = "logs:worker"


def _drain_worker_logs() -> None:
    if redis is None:
        return
    try:
        r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
        # LPUSH on worker side, so oldest is at tail. We pop from right.
        while True:
            item = r.rpop(WORKER_LOG_KEY)
            if not item:
                break
            import json
            try:
                row = json.loads(item)
                with _LOCK:
                    _RING.append(row)
            except Exception:
                pass
    except Exception:
        pass


@router.get("/logs")
def get_logs(_user=Depends(get_current_user)):
    """Authenticated log stream for the UI."""
    _drain_worker_logs()
    with _LOCK:
        # Most recent 120 entries, oldest first so the UI can append.
        rows = list(_RING)[-120:]
    return {"logs": rows, "ts": time.time()}
