from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

SECRET = os.getenv("JWT_SECRET", "changeme")
ALGO = "HS256"

def create_access_token(data: dict):
    data.update({"exp": datetime.utcnow() + timedelta(minutes=30)})
    return jwt.encode(data, SECRET, algorithm=ALGO)

def create_refresh_token(data: dict):
    data.update({"exp": datetime.utcnow() + timedelta(days=7)})
    return jwt.encode(data, SECRET, algorithm=ALGO)

def verify_token(token: str):
    return jwt.decode(token, SECRET, algorithms=[ALGO])
