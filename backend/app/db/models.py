from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped
from sqlalchemy import String, Float, DateTime, Text, JSON
from datetime import datetime
import uuid

class Base(DeclarativeBase):
    pass

class Shipment(Base):
    __tablename__ = "shipments"
    id: Mapped[str] = mapped_column(String, primary_key=True,
                                     default=lambda: str(uuid.uuid4()))
    vessel_name: Mapped[str] = mapped_column(String(100))
    vessel_imo: Mapped[str] = mapped_column(String(20), nullable=True)
    origin_port: Mapped[str] = mapped_column(String(10))
    dest_port: Mapped[str] = mapped_column(String(10))
    eta: Mapped[datetime] = mapped_column(DateTime)
    cargo_type: Mapped[str] = mapped_column(String(50))
    cargo_value_usd: Mapped[float] = mapped_column(Float, nullable=True)
    actual_arrival: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    delay_days: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime,
                                                   default=datetime.utcnow)

class RiskEvent(Base):
    __tablename__ = "risk_events"
    id: Mapped[str] = mapped_column(String, primary_key=True,
                                     default=lambda: str(uuid.uuid4()))
    shipment_id: Mapped[str] = mapped_column(String)
    event_type: Mapped[str] = mapped_column(String(50))
    severity: Mapped[str] = mapped_column(String(20))
    raw_payload: Mapped[dict] = mapped_column(JSON)
    recorded_at: Mapped[datetime] = mapped_column(DateTime,
                                                    default=datetime.utcnow)

class RiskAnalysis(Base):
    __tablename__ = "risk_analyses"
    id: Mapped[str] = mapped_column(String, primary_key=True,
                                     default=lambda: str(uuid.uuid4()))
    shipment_id: Mapped[str] = mapped_column(String)
    risk_score: Mapped[int] = mapped_column()
    delay_probability: Mapped[float] = mapped_column(Float)
    expected_delay_days: Mapped[float] = mapped_column(Float)
    shap_factors: Mapped[dict] = mapped_column(JSON)
    recommendations: Mapped[dict] = mapped_column(JSON)
    agent_trace: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime,
                                                   default=datetime.utcnow)
