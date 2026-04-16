from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Shipment

router = APIRouter()


@router.get("/shipments")
def list_shipments(db: Session = Depends(get_db)):
    ships = db.query(Shipment).order_by(Shipment.created_at.desc()).limit(100).all()
    return [
        {
            "id": s.id,
            "vessel_name": s.vessel_name,
            "origin_port": s.origin_port,
            "dest_port": s.dest_port,
            "eta": s.eta.isoformat() if s.eta else None,
            "cargo_type": s.cargo_type,
        }
        for s in ships
    ]
