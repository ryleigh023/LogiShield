import os
import redis
from fastapi import APIRouter

router = APIRouter()


@router.get("/stats")
def stats():
    """Live Redis / Celery / queue depth so the UI's ops strip can animate."""
    out = {
        "analyses_total": 0,
        "queue_depth": 0,
        "redis": "unknown",
        "celery": "unknown",
        "workers": [],
    }
    try:
        r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
        r.ping()
        out["redis"] = "ok"
        out["analyses_total"] = int(r.get("stats:analyses:total") or 0)
        out["queue_depth"] = int(r.llen("freight_tasks") or 0)
    except Exception as e:
        out["redis"] = f"error: {e.__class__.__name__}"

    try:
        from app.worker.celery_app import celery_app
        insp = celery_app.control.inspect(timeout=0.8)
        active = insp.active() or {}
        out["workers"] = list(active.keys())
        out["celery"] = "ok" if out["workers"] else "no-workers"
    except Exception as e:
        out["celery"] = f"error: {e.__class__.__name__}"

    return out
