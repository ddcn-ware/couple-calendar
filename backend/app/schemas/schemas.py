"""
Pydantic schemas = the shape of the JSON going in and out of the API.

Kept separate from the database models on purpose, e.g. UserOut doesn't
include password_hash so we can't accidentally send it to the browser.
  *Request / *Create / *Update -> what the frontend sends us
  *Out                         -> what we send back
FastAPI validates incoming data against these automatically (returns 422 if wrong).
Frontend versions of these types are in frontend/src/lib/types.ts - keep them in sync.
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr  # EmailStr rejects stuff that isn't an email
    password: str
    display_name: Optional[str] = None  # if empty we use the part of the email before @


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

    # lets pydantic read straight from a SQLAlchemy object instead of a dict
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


# everything optional so PATCH can update just one field
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
    creator: Optional[UserOut]  # nested so the frontend can show "Created by <name>"

    model_config = {"from_attributes": True}
