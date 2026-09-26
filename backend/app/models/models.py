"""
Database tables, written as Python classes (SQLAlchemy ORM).

  User   - one person's account
  Couple - the shared space two users belong to (has the invite code)
  Event  - a calendar event, belongs to a couple

If you change anything here you also need a new alembic migration in
alembic/versions/, otherwise the real database won't match.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


# all times are stored in UTC, the frontend converts to local time
def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)  # not really used yet
    # nullable because accounts from the magic link days didn't have a password
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # null until the user creates or joins a couple.
    # SET NULL = if the couple gets deleted the user just goes back to having no couple
    couple_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("couples.id", ondelete="SET NULL"), nullable=True
    )
    couple: Mapped["Couple | None"] = relationship("Couple", back_populates="members", foreign_keys=[couple_id])
    events: Mapped[list["Event"]] = relationship("Event", back_populates="creator")


class Couple(Base):
    __tablename__ = "couples"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # 6 chars right now (see couples.py) but column allows 8 in case I change it
    invite_code: Mapped[str] = mapped_column(String(8), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # max 2 members - this isn't enforced by the db, it's checked in the /couple/join endpoint
    members: Mapped[list["User"]] = relationship(
        "User", back_populates="couple", foreign_keys="User.couple_id"
    )
    events: Mapped[list["Event"]] = relationship("Event", back_populates="couple")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # events belong to the couple, not the user, so both people can see/edit them.
    # CASCADE = deleting a couple deletes all its events too
    couple_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("couples.id", ondelete="CASCADE"), nullable=False
    )
    # who made it (just for showing "Created by ..."), stays around if the user is deleted
    creator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#6366f1")  # hex colour
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    couple: Mapped["Couple"] = relationship("Couple", back_populates="events")
    creator: Mapped["User | None"] = relationship("User", back_populates="events")


# Old table from the magic link login. Nothing reads or writes it anymore,
# but it's still in the first migration so I left the model here to match.
class MagicToken(Base):
    __tablename__ = "magic_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
