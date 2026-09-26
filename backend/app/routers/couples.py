"""
/couple endpoints - how two users get linked together.

Flow: person A calls /create and gets an invite code, sends it to person B,
person B calls /join with the code. Now both users have the same couple_id
and see the same events.
"""
import random
import string
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Couple, User
from app.schemas.schemas import CoupleOut, JoinCouple

router = APIRouter(prefix="/couple", tags=["couple"])


def _gen_code(length: int = 6) -> str:
    # e.g. "K7QX2M". 36^6 = ~2 billion combos so collisions are super rare
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


async def _get_couple_with_members(couple_id: uuid.UUID, db: AsyncSession) -> Couple:
    # selectinload loads the members in the same go. Without it, accessing
    # couple.members later errors out in async sqlalchemy (no lazy loading)
    result = await db.execute(
        select(Couple).options(selectinload(Couple.members)).where(Couple.id == couple_id)
    )
    return result.scalar_one_or_none()


@router.post("/create", response_model=CoupleOut, status_code=201)
async def create_couple(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.couple_id:
        raise HTTPException(status_code=400, detail="You are already in a couple space.")

    code = _gen_code()
    # Ensure uniqueness
    while True:
        existing = await db.execute(select(Couple).where(Couple.invite_code == code))
        if not existing.scalar_one_or_none():
            break
        code = _gen_code()

    couple = Couple(id=uuid.uuid4(), invite_code=code)
    db.add(couple)
    await db.flush()  # sends the INSERT so the couple exists before we point the user at it

    current_user.couple_id = couple.id
    await db.commit()

    return await _get_couple_with_members(couple.id, db)


@router.post("/join", response_model=CoupleOut)
async def join_couple(
    body: JoinCouple,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.couple_id:
        raise HTTPException(status_code=400, detail="You are already in a couple space.")

    # codes are stored uppercase, so "abc123" still works
    result = await db.execute(select(Couple).where(Couple.invite_code == body.invite_code.upper()))
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=404, detail="Invite code not found.")

    # Load members to check capacity - it's a couple calendar so max 2
    couple_with_members = await _get_couple_with_members(couple.id, db)
    if len(couple_with_members.members) >= 2:
        raise HTTPException(status_code=400, detail="This couple space is already full.")

    current_user.couple_id = couple.id
    await db.commit()

    return await _get_couple_with_members(couple.id, db)


@router.get("/me", response_model=CoupleOut)
async def get_my_couple(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # the frontend uses the 404 here to know it should send you to the /pair page
    if not current_user.couple_id:
        raise HTTPException(status_code=404, detail="You are not in a couple space yet.")
    couple = await _get_couple_with_members(current_user.couple_id, db)
    if not couple:
        raise HTTPException(status_code=404, detail="Couple not found.")
    return couple


# just unlinks you - the couple and its events stay in the db.
# (no button for this in the frontend yet)
@router.delete("/leave", status_code=204)
async def leave_couple(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.couple_id = None
    await db.commit()
