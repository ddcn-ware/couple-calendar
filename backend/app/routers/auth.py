"""
/auth endpoints - sign up, log in, and get/update your own account.
Register and login both just return a JWT, the frontend saves it in localStorage.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import LoginRequest, RegisterRequest, TokenResponse, UpdateDisplayName, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = User(
        id=uuid.uuid4(),
        email=body.email,
        display_name=body.display_name or body.email.split("@")[0],
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()

    # log them straight in after signing up
    return TokenResponse(access_token=create_access_token(subject=body.email))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # same error for "no such user" and "wrong password" so people can't
    # use this to check which emails have accounts
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return TokenResponse(access_token=create_access_token(subject=body.email))


# frontend calls this on load to check the saved token still works
@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


# change display name (the frontend doesn't have a UI for this yet)
@router.patch("/me", response_model=UserOut)
async def update_me(
    body: UpdateDisplayName,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.display_name = body.display_name
    await db.commit()
    await db.refresh(current_user)
    return current_user
