import os
import logging
from fastapi import APIRouter, HTTPException, Depends
from app.auth.jwt import create_access_token, create_refresh_token, verify_token
from app.auth.otp import generate_otp, verify_otp, send_otp_email
from app.auth.pii import encrypt_pii
from app.db.database import get_db
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

logger = logging.getLogger("freightsentinel")

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

IS_DEV = os.getenv("ENVIRONMENT", "development") != "production"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str


class RefreshRequest(BaseModel):
    refresh_token: str


def _ensure_seeded(db: Session):
    """Create a demo admin + demo user on first boot so MFA flow works out-of-the-box."""
    from app.auth.models import User, UserRole
    if db.query(User).count() > 0:
        return
    db.add(User(
        email="admin@freightsentinel.ai",
        hashed_password=pwd_context.hash("admin123"),
        role=UserRole.admin,
        encrypted_phone=encrypt_pii("+10000000000"),
    ))
    db.add(User(
        email="user@freightsentinel.ai",
        hashed_password=pwd_context.hash("user123"),
        role=UserRole.user,
        encrypted_phone=encrypt_pii("+10000000001"),
    ))
    db.commit()


@router.post("/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    from app.auth.models import User
    _ensure_seeded(db)
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not pwd_context.verify(req.password, user.hashed_password):
        # Constant-ish latency and opaque message — don't leak which half was wrong.
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(403, "Account disabled")
    otp = await generate_otp(req.email)
    await send_otp_email(req.email, otp)
    payload = {"msg": "OTP sent to email"}
    # In dev we return the OTP so the UI can demo the MFA flow without a real mailbox.
    if IS_DEV:
        payload["dev_otp"] = otp
    logger.info({"event": "login_otp_sent", "email_masked": _mask(req.email)})
    return payload


@router.post("/verify-otp")
async def verify(req: OTPVerify, db: Session = Depends(get_db)):
    from app.auth.models import User
    if not await verify_otp(req.email, req.otp):
        raise HTTPException(401, "Invalid or expired OTP")
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(404, "User not found")

    claims = {"sub": user.email, "role": user.role.value, "name": user.email.split("@")[0]}
    return {
        "access_token": create_access_token(claims),
        "refresh_token": create_refresh_token(claims),
        "user": {
            "email": user.email,
            "name": user.email.split("@")[0].title(),
            "picture": None,
            "role": user.role.value,
        },
    }


@router.post("/refresh")
async def refresh(req: RefreshRequest):
    try:
        payload = verify_token(req.refresh_token)
    except Exception:
        raise HTTPException(401, "Invalid refresh token")
    claims = {k: v for k, v in payload.items() if k not in ("exp", "iat")}
    return {"access_token": create_access_token(claims)}


def _mask(email: str) -> str:
    if "@" not in email:
        return "***"
    a, b = email.split("@", 1)
    return (a[0] + "***" if len(a) > 1 else "***") + "@" + b
