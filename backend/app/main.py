import logging
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

from app.middleware.tracing import TracingMiddleware
from app.auth.routes import router as auth_router
from app.auth.google import router as google_auth_router
from app.api.routes.analyze import router as analyze_router
from app.api.routes.shipments import router as shipments_router
from app.api.routes.stats import router as stats_router
from app.api.routes.admin import router as admin_router
from app.api.routes.logs import router as logs_router, install_ring_handler
from app.db.models import Base


# ────────── structured logging ──────────
logging.basicConfig(
    level=logging.INFO,
    format='{"ts":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":%(message)s}',
    stream=sys.stdout,
)
install_ring_handler()  # so /api/v1/logs has content to stream


# ────────── create tables (demo-grade; use Alembic in prod) ──────────
sync_db_url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
if sync_db_url:
    sync_engine = create_engine(sync_db_url, poolclass=NullPool, echo=False)
    from app.auth.models import User  # noqa: F401 — ensure registered
    Base.metadata.create_all(bind=sync_engine)
    sync_engine.dispose()


app = FastAPI(title="FreightSentinel", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Trace-Id"],
)
app.add_middleware(TracingMiddleware)

Instrumentator().instrument(app).expose(app)

app.include_router(auth_router)
app.include_router(google_auth_router)
app.include_router(analyze_router, prefix="/api/v1")
app.include_router(shipments_router, prefix="/api/v1")
app.include_router(stats_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(logs_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
