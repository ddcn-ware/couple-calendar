import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, create_magic_token, decode_magic_token
from app.db.session import get_db
from app.models.models import MagicToken, User
from app.schemas.schemas import MagicLinkRequest, MagicLinkVerify, TokenResponse, UpdateDisplayName, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/magic-link", status_code=202)
async def request_magic_link(body: MagicLinkRequest, db: AsyncSession = Depends(get_db)):
    """Create or fetch user and issue a magic login link (printed to console)."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            id=uuid.uuid4(),
            email=body.email,
            display_name=body.display_name or body.email.split("@")[0],
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    raw_token = create_magic_token(body.email)
    magic = MagicToken(
        id=uuid.uuid4(),
        email=body.email,
        token=raw_token,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.MAGIC_LINK_EXPIRE_MINUTES),
    )
    db.add(magic)
    await db.commit()

    link = f"{settings.FRONTEND_URL}/auth/verify?token={raw_token}"
    # ── No email integration — print to console for local use ──────────────
    print(f"\n{'='*60}")
    print(f"  MAGIC LOGIN LINK for {body.email}")
    print(f"  {link}")
    print(f"  (expires in {settings.MAGIC_LINK_EXPIRE_MINUTES} minutes)")
    print(f"{'='*60}\n", flush=True)

    return {"detail": "Magic link printed to server console."}


@router.post("/verify", response_model=TokenResponse)
async def verify_magic_link(body: MagicLinkVerify, db: AsyncSession = Depends(get_db)):
    email = decode_magic_token(body.token)
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    result = await db.execute(
        select(MagicToken).where(MagicToken.token == body.token, MagicToken.used == False)  # noqa: E712
    )
    magic = result.scalar_one_or_none()
    if not magic:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token already used or not found")
    if magic.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token expired")

    magic.used = True
    await db.commit()

    access_token = create_access_token(subject=email)
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


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
