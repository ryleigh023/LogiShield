"""Google Sign-In verification.

We verify the ID token against Google's public tokeninfo endpoint —
no extra dependencies, no private-key juggling. Good enough for a
hackathon demo; for production you'd use `google-auth` and verify
the JWT signature locally using Google's JWKS.
"""
import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.auth.jwt import create_access_token, create_refresh_token

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo"


class GoogleLoginRequest(BaseModel):
    id_token: str


@router.post("/google")
async def google_login(req: GoogleLoginRequest):
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(GOOGLE_TOKENINFO, params={"id_token": req.id_token})

    if r.status_code != 200:
        raise HTTPException(401, "Invalid Google ID token")

    data = r.json()

    # If you've set GOOGLE_CLIENT_ID, enforce audience match.
    expected_aud = os.getenv("GOOGLE_CLIENT_ID")
    if expected_aud and data.get("aud") != expected_aud:
        raise HTTPException(401, "Token audience mismatch")

    if not data.get("email_verified") in (True, "true"):
        raise HTTPException(401, "Email not verified by Google")

    email = data["email"]
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")

    claims = {"sub": email, "name": name, "picture": picture, "provider": "google"}
    return {
        "access_token": create_access_token(claims),
        "refresh_token": create_refresh_token(claims),
        "user": {"email": email, "name": name, "picture": picture},
    }


@router.post("/demo")
async def demo_login():
    """No-Google fallback so the demo works on any laptop."""
    claims = {"sub": "demo@freightsentinel.ai", "name": "Demo User", "provider": "demo"}
    return {
        "access_token": create_access_token(claims),
        "refresh_token": create_refresh_token(claims),
        "user": {"email": "demo@freightsentinel.ai", "name": "Demo User", "picture": None},
    }
