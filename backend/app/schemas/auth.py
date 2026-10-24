from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class UserSignUpRequest(BaseModel):
    full_name: str
    email: str
    password: str
    preferred_station: Optional[str] = "MH005"

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    id: int
    full_name: str
    email: str
    preferred_station: str
    is_active: bool
    created_at: Optional[datetime] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
