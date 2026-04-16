from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import os
import threading

class DatabaseSingleton:
    """
    Singleton pattern implementation for the Database connection pool.
    Ensures only a single connection pool registry is created across the application.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DatabaseSingleton, cls).__new__(cls)
                cls._instance._initialize()
            return cls._instance

    def _initialize(self):
        # Normalize to sync driver — asyncpg is async-only and blows up create_engine.
        db_url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
        self.engine = create_engine(db_url, pool_pre_ping=True)
        self.SessionLocal = sessionmaker(bind=self.engine)

db_singleton = DatabaseSingleton()
SessionLocal = db_singleton.SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
