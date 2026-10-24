import hashlib
import os
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    preferred_station = Column(String(50), default="MH005")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @staticmethod
    def hash_password(password: str) -> str:
        salt = "mumbai_airsense_auth_salt_2026"
        return hashlib.sha256((salt + password).encode('utf-8')).hexdigest()

    def verify_password(self, password: str) -> bool:
        return self.password_hash == self.hash_password(password)
