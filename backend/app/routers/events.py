import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.core.ws_manager import manager
from app.db.session import get_db
from app.models.models import Event, User
from app.schemas.schemas import EventCreate, EventOut, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])


def _require_couple(user: User) -> uuid.UUID:
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="You must be in a couple space first.")
    return user.couple_id


async def _get_event(event_id: uuid.UUID, couple_id: uuid.UUID, db: AsyncSession) -> Event:
    result = await db.execute(
        select(Event)
        .options(selectinload(Event.creator))
        .where(Event.id == event_id, Event.couple_id == couple_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    return event


@router.get("", response_model=list[EventOut])
async def list_events(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    couple_id = _require_couple(current_user)
    filters = [Event.couple_id == couple_id]
    if start:
        filters.append(Event.end_at >= start)
    if end:
        filters.append(Event.start_at <= end)

    result = await db.execute(
        select(Event).options(selectinload(Event.creator)).where(and_(*filters)).order_by(Event.start_at)
    )
    return result.scalars().all()


@router.post("", response_model=EventOut, status_code=201)
async def create_event(
    body: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    couple_id = _require_couple(current_user)
    if body.end_at <= body.start_at:
        raise HTTPException(status_code=400, detail="end_at must be after start_at.")

    event = Event(
        id=uuid.uuid4(),
        couple_id=couple_id,
        creator_id=current_user.id,
        **body.model_dump(),
    )
    db.add(event)
    await db.commit()

    # Reload with creator relationship
    result = await db.execute(
        select(Event).options(selectinload(Event.creator)).where(Event.id == event.id)
    )
    event = result.scalar_one()

    await manager.broadcast(str(couple_id), {"type": "event_created", "event": EventOut.model_validate(event).model_dump()})
    return event


@router.get("/{event_id}", response_model=EventOut)
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    couple_id = _require_couple(current_user)
    return await _get_event(event_id, couple_id, db)


@router.patch("/{event_id}", response_model=EventOut)
async def update_event(
    event_id: uuid.UUID,
    body: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    couple_id = _require_couple(current_user)
    event = await _get_event(event_id, couple_id, db)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(event, field, value)

    if event.end_at <= event.start_at:
        raise HTTPException(status_code=400, detail="end_at must be after start_at.")

    await db.commit()
    await db.refresh(event)

    result = await db.execute(
        select(Event).options(selectinload(Event.creator)).where(Event.id == event.id)
    )
    event = result.scalar_one()

    await manager.broadcast(str(couple_id), {"type": "event_updated", "event": EventOut.model_validate(event).model_dump()})
    return event


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    couple_id = _require_couple(current_user)
    event = await _get_event(event_id, couple_id, db)
    await db.delete(event)
    await db.commit()
    await manager.broadcast(str(couple_id), {"type": "event_deleted", "event_id": str(event_id)})
