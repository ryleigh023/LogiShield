import asyncio
from app.db.database import AsyncSessionLocal
from app.db.models import Shipment
from datetime import datetime, timedelta

SEED_SHIPS = [
    dict(id="ship-001", vessel_name="MAERSK SENTOSA", vessel_imo="IMO9234567",
         origin_port="CNSHA", dest_port="AEJEA", cargo_type="electronics",
         cargo_value_usd=4_200_000,
         eta=datetime.utcnow() + timedelta(days=3)),
    dict(id="ship-002", vessel_name="MSC AURORA", vessel_imo="IMO9345678",
         origin_port="DEHAM", dest_port="SGSIN", cargo_type="machinery",
         cargo_value_usd=1_800_000,
         eta=datetime.utcnow() + timedelta(days=8)),
    dict(id="ship-003", vessel_name="CMA TIARA", vessel_imo="IMO9456789",
         origin_port="USLAX", dest_port="JPYOK", cargo_type="automotive",
         cargo_value_usd=900_000,
         eta=datetime.utcnow() + timedelta(days=12)),
    dict(id="ship-004", vessel_name="EVERGREEN STAR", vessel_imo="IMO9567890",
         origin_port="MYPKG", dest_port="NLRTM", cargo_type="bulk",
         cargo_value_usd=500_000,
         eta=datetime.utcnow() + timedelta(days=5)),
]

async def seed():
    async with AsyncSessionLocal() as db:
        for s in SEED_SHIPS:
            db.add(Shipment(**s))
        await db.commit()
    print(f"Seeded {len(SEED_SHIPS)} shipments OK")

asyncio.run(seed())
