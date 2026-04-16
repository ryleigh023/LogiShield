from sqlalchemy import Column, String, Boolean, Enum
from app.db.models import Base
import enum, uuid

class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.user)
    is_active = Column(Boolean, default=True)
    otp_secret = Column(String, nullable=True)      # MFA
    encrypted_phone = Column(String, nullable=True) # PII encrypted
