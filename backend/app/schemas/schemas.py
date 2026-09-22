import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── User ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    couple_id: Optional[uuid.UUID]

    model_config = {"from_attributes": True}


# ── Couple ────────────────────────────────────────────────────────────────────

class CoupleOut(BaseModel):
    id: uuid.UUID
    invite_code: str
    members: list[UserOut]

    model_config = {"from_attributes": True}


class JoinCouple(BaseModel):
    invite_code: str


class UpdateDisplayName(BaseModel):
    display_name: str


# ── Event ─────────────────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    color: str = "#6366f1"
    start_at: datetime
    end_at: datetime


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    color: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None


class EventOut(BaseModel):
    id: uuid.UUID
    couple_id: uuid.UUID
    creator_id: Optional[uuid.UUID]
    title: str
    description: Optional[str]
    location: Optional[str]
    color: str
    start_at: datetime
    end_at: datetime
    created_at: datetime
    updated_at: datetime
    creator: Optional[UserOut]

    model_config = {"from_attributes": True}
