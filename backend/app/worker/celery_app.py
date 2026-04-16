from celery import Celery
import os

celery_app = Celery(
    "freightsentinel",
    broker=os.getenv("REDIS_URL", "redis://redis:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://redis:6379/0"),
    include=["app.worker.tasks"]
)
celery_app.conf.task_acks_late = True       # atomic pickup
celery_app.conf.task_reject_on_worker_lost = True
celery_app.conf.task_routes = {"app.worker.tasks.*": {"queue": "freight_tasks"}}
