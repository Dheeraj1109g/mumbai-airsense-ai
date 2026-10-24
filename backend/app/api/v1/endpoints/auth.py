from typing import Optional
import secrets
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import UserSignUpRequest, UserLoginRequest, AuthResponse, UserProfile

router = APIRouter()

# In-memory session token store for fast lightweight token validation
# mapping: token -> user_id
_ACTIVE_SESSIONS = {}

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authentication token")
    token = authorization.split("Bearer ")[1].strip()
    user_id = _ACTIVE_SESSIONS.get(token)
    if not user_id:
        # Fallback: check if it's the demo token
        if token == "demo-citizen-token-2026":
            user = db.query(User).filter(User.email == "demo@airsense.in").first()
            if user:
                return user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found")
    return user

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, summary="Register a new citizen account")
def signup(data: UserSignUpRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered. Please log in.")

    new_user = User(
        full_name=data.full_name.strip(),
        email=data.email.lower().strip(),
        password_hash=User.hash_password(data.password),
        preferred_station=data.preferred_station or "MH005",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = secrets.token_hex(24)
    _ACTIVE_SESSIONS[token] = new_user.id

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfile(
            id=new_user.id,
            full_name=new_user.full_name,
            email=new_user.email,
            preferred_station=new_user.preferred_station,
            is_active=new_user.is_active,
            created_at=new_user.created_at
        )
    )

@router.post("/login", response_model=AuthResponse, summary="Sign in with email and password")
def login(data: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user or not user.verify_password(data.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    token = secrets.token_hex(24)
    _ACTIVE_SESSIONS[token] = user.id

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfile(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            preferred_station=user.preferred_station,
            is_active=user.is_active,
            created_at=user.created_at
        )
    )

@router.get("/me", response_model=UserProfile, summary="Retrieve authenticated citizen profile")
def get_me(user: User = Depends(get_current_user)):
    return UserProfile(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        preferred_station=user.preferred_station,
        is_active=user.is_active,
        created_at=user.created_at
    )

@router.post("/preferred-station", response_model=UserProfile, summary="Update citizen preferred monitoring station")
def update_preferred_station(station_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.preferred_station = station_id
    db.commit()
    db.refresh(user)
    return UserProfile(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        preferred_station=user.preferred_station,
        is_active=user.is_active,
        created_at=user.created_at
    )
