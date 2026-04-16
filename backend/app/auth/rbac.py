from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.jwt import verify_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    request: Request = None,
):
    if creds is None or not creds.credentials:
        raise HTTPException(401, "Missing bearer token")
    try:
        claims = verify_token(creds.credentials)
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    # attach to request state for downstream access (e.g. logging)
    if request is not None:
        request.state.user = claims
    return claims


def require_role(*roles: str):
    def checker(user=Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(403, "Forbidden — insufficient role")
        return user
    return checker
