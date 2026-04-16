import asyncio
import json
import logging
import os
import uuid

import redis as redis_lib
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.worker.tasks import analyze_shipment_task
from app.worker.celery_app import celery_app
from app.agent.orchestrator import run_agent
from app.auth.rbac import get_current_user

logger = logging.getLogger("freightsentinel")
router = APIRouter()

DEFAULT_ORIGIN_FOR_DEST = {
    "AEJEA": "CNSHA", "SGSIN": "DEHAM", "JPYOK": "USLAX",
    "NLRTM": "MYPKG", "DEHAM": "CNSHA", "USLAX": "CNSHA",
}

# Auth on /analyze is enforced unless REQUIRE_AUTH=false (handy for demos).
REQUIRE_AUTH = os.getenv("REQUIRE_AUTH", "true").lower() != "false"


def _auth_dep():
    if REQUIRE_AUTH:
        return Depends(get_current_user)
    # No-op dependency returns {} when auth is disabled.
    async def _noop():
        return {}
    return Depends(_noop)


def _normalize(payload: dict) -> dict:
    p = dict(payload)
    p.setdefault("origin_port", DEFAULT_ORIGIN_FOR_DEST.get(p.get("dest_port", ""), "CNSHA"))
    p.setdefault("cargo_type", "general")
    return p


def _broker_up() -> bool:
    try:
        r = redis_lib.Redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            socket_connect_timeout=0.3,
        )
        r.ping()
        return True
    except Exception:
        return False


@router.post("/analyze")
async def analyze(payload: dict, request: Request, user=_auth_dep()):
    """Queue on Celery, wait for the worker, fall back in-process if the broker is down."""
    shipment_id = str(uuid.uuid4())
    ship = _normalize(payload)
    trace_id = getattr(request.state, "trace_id", None)

    logger.info({"event": "analyze_requested", "shipment_id": shipment_id,
                 "trace_id": trace_id, "user": user.get("sub") if user else None})

    if _broker_up():
        try:
            task = analyze_shipment_task.apply_async(
                args=[shipment_id, ship],
                queue="freight_tasks",
                headers={"trace_id": trace_id},     # propagate across boundary
            )
            result = task.get(timeout=25, propagate=True)
            return {"shipment_id": shipment_id, "task_id": task.id, **result}
        except Exception as e:
            logger.exception("worker call failed, falling back")
            result = await run_agent(ship)
            return {
                "shipment_id": shipment_id, "task_id": None,
                "fallback": True, "error": str(e), **result,
            }

    result = await run_agent(ship)
    return {"shipment_id": shipment_id, "task_id": None, "fallback": True, **result}


@router.get("/analyze/{task_id}/status")
async def get_status(task_id: str, user=_auth_dep()):
    task = celery_app.AsyncResult(task_id)
    return {"status": task.status, "result": task.result if task.ready() else None}


@router.post("/analyze/stream")
async def analyze_stream(payload: dict, request: Request, user=_auth_dep()):
    """
    SSE stream of the agent's ReAct trace.
    We run the agent in-process here because streaming intermediate trace
    events through Celery isn't worth the complexity for a demo — this path
    is a view on the same orchestrator the worker would run.
    """
    ship = _normalize(payload)
    trace_id = getattr(request.state, "trace_id", None)

    async def event_gen():
        # Fan out the agent; emit heartbeats until it's done, then stream the full trace.
        container: dict = {}
        async def run_and_capture():
            container["result"] = await run_agent(ship)
            container["done"] = True
        task = asyncio.create_task(run_and_capture())

        tick = 0
        while not container.get("done"):
            await asyncio.sleep(0.15)
            yield f"event: heartbeat\ndata: {json.dumps({'tick': tick, 'trace_id': trace_id})}\n\n"
            tick += 1
            if tick > 120:
                break

        try:
            await task
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            return

        res = container["result"]
        for step in res.get("agent_trace", []):
            yield f"event: trace\ndata: {json.dumps(step)}\n\n"
            await asyncio.sleep(0.12)   # give the UI a chance to animate in

        final = {k: v for k, v in res.items() if k != "agent_trace"}
        final["trace_id"] = trace_id
        yield f"event: final\ndata: {json.dumps(final, default=str)}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")
