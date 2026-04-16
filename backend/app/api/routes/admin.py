from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.auth.rbac import require_role

router = APIRouter()


@router.get("/admin/users")
def list_users(
    _admin=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin-only. Emails returned as-is for the admin; the UI masks them further.
    Phone numbers are encrypted at rest and never returned."""
    from app.auth.models import User
    users = db.query(User).all()
    return {
        "users": [
            {
                "email": u.email,
                "role": u.role.value if hasattr(u.role, "value") else str(u.role),
                "is_active": bool(u.is_active),
            }
            for u in users
        ]
    }
