import asyncio
import json
import os
import socket
from datetime import datetime, timezone

import redis
from celery.utils.log import get_task_logger

from app.worker.celery_app import celery_app

logger = get_task_logger(__name__)

WORKER_ID = f"{socket.gethostname()}-{os.getpid()}"
WORKER_LOG_KEY = "logs:worker"


def _push_log(level: str, message: str, trace_id: str = "") -> None:
    """Forward a structured log line to the shared Redis ring so the backend
    /logs endpoint can surface it alongside API logs (poor-man's Loki).
    """
    try:
        r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
        row = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "service": "worker",
            "trace_id": trace_id,
            "message": f"[{WORKER_ID}] {message}",
        }
        r.lpush(WORKER_LOG_KEY, json.dumps(row))
        r.ltrim(WORKER_LOG_KEY, 0, 999)
    except Exception:
        pass


@celery_app.task(bind=True, name="analyze_shipment", max_retries=3)
def analyze_shipment_task(self, shipment_id: str, payload: dict):
    """
    Atomic, idempotent analysis task.

    - task_acks_late + reject_on_worker_lost (celery_app config) ensure we don't
      lose the task if a worker dies mid-run.
    - Redis SET NX EX turns the first worker that touches a shipment_id into the
      owner; duplicates short-circuit with {"status":"duplicate"}.
    - trace_id is propagated via Celery headers so the whole request/worker flow
      shares one ID in the log stream.
    """
    trace_id = (self.request.headers or {}).get("trace_id", "") if hasattr(self, "request") else ""

    lock_key = f"lock:analyze:{shipment_id}"
    r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))

    # Atomic acquire — NX means "only if not set", EX is TTL seconds.
    if not r.set(lock_key, WORKER_ID, nx=True, ex=3600):
        logger.info(f"Duplicate task for {shipment_id}, skipping")
        _push_log("warn", f"duplicate task {shipment_id} skipped", trace_id)
        return {"status": "duplicate", "worker": WORKER_ID}

    _push_log("info", f"picked up shipment {shipment_id}", trace_id)
    logger.info(f"[{WORKER_ID}] analyzing {shipment_id}")

    try:
        from app.agent.orchestrator import run_agent
        result = asyncio.run(run_agent(payload))
        try:
            r.incr("stats:analyses:total")
        except Exception:
            pass
        result["worker"] = WORKER_ID
        _push_log("info", f"completed {shipment_id} score={result.get('risk_score')}", trace_id)
        return result
    except Exception as e:
        _push_log("error", f"task failed {shipment_id}: {e}", trace_id)
        logger.exception("task failed")
        raise self.retry(exc=e, countdown=60)
    finally:
        r.delete(lock_key)
