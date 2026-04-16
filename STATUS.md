# FreightSentinel — Hackathon Status

_Last updated: 2026-04-16_

## TL;DR of your four questions

| # | Question | Answer |
|---|----------|--------|
| 1 | Are backend & frontend connected? | **Yes — now wired end-to-end.** Frontend was hitting a queue-only endpoint (got `{task_id, status:"queued"}` instead of a result) and an auth-protected route with no token. Both fixed. |
| 2 | Is the DB Postgres (not SQLite)? | **Postgres.** `postgres:15-alpine` in `docker-compose.yml`. `.env` and the compose env now agree on host `postgres`, DB `freightsentinel_db`. Data persists across `docker compose up/down` (volume can be added if you want it across `down -v`). |
| 3 | Are components dockerized separately? | **Yes — 7 services, each its own container:** `postgres`, `redis`, `backend` (FastAPI), `worker` (Celery), `frontend` (nginx-served Vite build), `prometheus`, `grafana`, all on one `freightnet` bridge. |
| 4 | Is Redis / queueing working? | **Yes.** Celery broker + backend = Redis. Queue `freight_tasks`. Idempotency lock via `SET NX EX 3600`. Retry policy `max_retries=3, countdown=60`. Worker starts with `celery -A app.worker.celery_app worker -Q freight_tasks -c 1`. |

## What's working now

### Runtime path
1. React UI → `POST /api/v1/analyze` (no auth, demo mode)
2. FastAPI queues a Celery task (`analyze_shipment`) on Redis queue `freight_tasks`
3. Celery worker pops the task, acquires an idempotency lock in Redis, runs the async agent via `asyncio.run(run_agent(...))`
4. Agent dispatches 4 tools **in parallel** via `asyncio.gather`: weather (OpenWeather), port congestion (simulated), news (NewsAPI), historical lane stats
5. Weighted risk score + SHAP-style factor breakdown + rule-based recommendations + full ReAct trace are returned
6. FastAPI returns the task result to the UI (waits up to 20s for the worker, falls back to in-process execution if the worker is unreachable)

### Endpoints
- `POST /api/v1/analyze` — main synchronous analysis (queues + waits)
- `POST /api/v1/analyze/stream` — **Server-Sent Events** streaming the agent's ReAct trace step by step (new judge-appeal feature)
- `GET  /api/v1/analyze/{task_id}/status` — Celery task status polling
- `GET  /api/v1/shipments` — list (sync SQLAlchemy)
- `GET  /api/v1/stats` — live Redis / Celery / queue-depth / total-analyses (new)
- `GET  /health` — liveness
- `GET  /metrics` — Prometheus (via `prometheus-fastapi-instrumentator`)
- `POST /auth/login`, `POST /auth/verify-otp`, `POST /auth/refresh` — email + OTP flow

### Frontend
- Vessel selector → synchronous analyze → risk score, factor breakdown, recommendations, **full agent reasoning trace displayed**
- Live "ops strip": Redis health, Celery health, queue depth, total analyses (auto-refresh every 4s)
- Fallback-mode indicator if the worker is down

### Infra
- `docker-compose.yml` brings up Postgres, Redis, backend, worker, frontend, Prometheus, Grafana
- Prometheus now mounts `monitoring/prometheus.yml` and scrapes `backend:8000/metrics`
- Grafana available on `localhost:3001` (admin / admin)
- Backend exports tracing middleware, JSON logs, X-Trace-Id response header

## Bugs fixed in this pass

| File | Bug | Fix |
|------|-----|-----|
| `backend/app/worker/tasks.py` | Called `run_analysis` which doesn't exist; agent is async | Now calls `run_agent` with `asyncio.run(...)`; bumps `stats:analyses:total` counter |
| `backend/app/api/routes/analyze.py` | Returned only `task_id` / `queued`; required auth; crashed on missing `origin_port` | Synchronous wait-for-worker with in-process fallback; auth removed for demo; `origin_port` defaulted |
| `backend/app/auth/models.py` | `from app.db.base import Base` — no such module | Imports from `app.db.models` |
| `backend/app/auth/routes.py` | `generate_otp` / `verify_otp` are async but not awaited | Awaited |
| `backend/app/db/database.py` | `create_engine(postgresql+asyncpg://…)` fails — asyncpg is async-only | Strip `+asyncpg` for sync engine; added `pool_pre_ping` |
| `backend/app/api/routes/shipments.py` | `AsyncSession` used with a sync `get_db` | Switched to sync `Session` |
| `backend/app/main.py` | CORS only allowed `:5173` | Also allows `:3000` and `:80` |
| `backend/.env` | Host `db` / DB `freightdb` — didn't match docker-compose | Aligned to `postgres` / `freightsentinel_db` |
| `docker-compose.yml` | Prometheus ran without config | Mounts `monitoring/prometheus.yml`, depends on backend |
| Frontend `App.tsx` / `client.ts` | Expected flat fields, no trace/ops view, out-of-date demo ETAs | New UI: factors from `shap_factors`, full agent-trace panel, live stats strip, 2026 ETAs |

## New features added (judge-appreciable)

1. **Live agent reasoning trace in the UI** — users see `THOUGHT → ACTION → OBSERVATION → FINAL` steps, color-coded. Demonstrates explainable AI.
2. **`POST /analyze/stream` Server-Sent Events** — live-streams the agent's trace over HTTP/SSE (easy to wire to the UI next).
3. **Live ops dashboard strip** — top of the UI shows Redis health, Celery health, queue depth, running total of analyses. Polls `/api/v1/stats` every 4s.
4. **Graceful worker-down fallback** — if Celery is unreachable, FastAPI runs the agent in-process and flags `fallback: true` so the demo never dies on stage.
5. **Idempotent workers** — Redis `SET NX` lock per shipment_id prevents duplicate analyses.
6. **SHAP-style factor breakdown + confidence interval on expected delay** — already in the scorer, now surfaced in the UI.
7. **Prometheus /metrics + Grafana dashboard scaffolding** — judges can see request histograms and queue metrics in real time.
8. **Trace ID propagation** — every request gets a UUID, logged + returned as `X-Trace-Id`.

## What's *not* done / caveats

- Full email+OTP auth flow is implemented in the backend but the frontend has no login screen — analyze runs unauthenticated (demo mode). Flip the `Depends(get_current_user)` back on in `analyze.py` after you add a login UI.
- `main.py` auto-creates tables on startup via SQLAlchemy — fine for demo, you'd normally use Alembic (dependency is already installed).
- DB doesn't persist across `docker compose down -v`. Add a named volume on the `postgres` service if you need persistence.
- `news` and `weather` tools have live API keys in the committed `.env` — **rotate these after the hackathon**; they shouldn't be in git.
- `worker` in docker-compose runs with `-c 1` (single process). Bump concurrency for throughput if demoing load.
- Frontend's SSE endpoint exists on the backend but is not yet consumed by the UI (UI uses the synchronous endpoint). Connecting `EventSource` to `/analyze/stream` is the next obvious 15-minute polish.
- XGBoost model at `data/model_xgb.pkl` and `backend/app/models/model_xgb.pkl` is not currently invoked by `run_agent`; the score is the weighted heuristic in `risk_scorer.py`. If judges ask "where's the ML", you can either (a) wire the `.pkl` into the orchestrator or (b) honestly frame the heuristic as the production-safe path while the XGB model is validated.

## If you have 1–2 hours left, do these in order

1. **Wire the UI to the SSE endpoint** — replace the spinner with the live trace as it arrives. High visual impact.
2. **Load the XGBoost model** in the orchestrator and blend its `P(delay>2d)` with the heuristic → "ML + rules hybrid".
3. **Persist the analysis** — write each completed analysis into `risk_analyses` table so `/api/v1/shipments` shows history. Already have the model.
4. **Build a Grafana dashboard JSON** and volume-mount it so it auto-loads — one panel for request rate, one for queue depth, one for error rate.
5. **Add a second vessel batch endpoint** `/analyze/batch` that fans out N analyses in parallel via Celery — visually impressive on the queue-depth chart.
6. **Re-enable auth on `/analyze`** and build a tiny login screen — shows the full MFA story.

## Run it

```bash
# From repo root
docker compose up --build
# Frontend:  http://localhost:5173
# Backend:   http://localhost:8000/docs
# Stats:     http://localhost:8000/api/v1/stats
# Grafana:   http://localhost:3001   (admin/admin)
# Prometheus http://localhost:9090
```

Happy shipping. 🚢
