"""
Seed two paired users and a handful of sample events.
Handy for testing without having to sign up two accounts every time.

WARNING: this deletes ALL existing users, couples and events first.
Don't run it against the real Railway database.

Usage (from backend/ directory):
    DATABASE_URL=postgresql+asyncpg://couple:couple@localhost:5432/couple_calendar \
    python scripts/seed.py

Or with docker:
    docker compose exec backend python scripts/seed.py
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Allow running from backend/ directory
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import hash_password
from app.models.models import Couple, Event, User

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://couple:couple@localhost:5432/couple_calendar",
)

# both test accounts use this so you can log in as either one
TEST_PASSWORD = "password123"

COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"]


async def seed():
    engine = create_async_engine(DB_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        # Wipe existing data (events first because they reference users/couples)
        await db.execute(sa.text("DELETE FROM events"))
        await db.execute(sa.text("DELETE FROM users"))
        await db.execute(sa.text("DELETE FROM couples"))
        await db.commit()

        couple = Couple(id=uuid.uuid4(), invite_code="TESTXY")
        db.add(couple)
        await db.flush()

        alice = User(
            id=uuid.uuid4(),
            email="alice@example.com",
            display_name="Alice",
            password_hash=hash_password(TEST_PASSWORD),
            couple_id=couple.id,
        )
        bob = User(
            id=uuid.uuid4(),
            email="bob@example.com",
            display_name="Bob",
            password_hash=hash_password(TEST_PASSWORD),
            couple_id=couple.id,
        )
        db.add_all([alice, bob])
        await db.flush()

        # midnight today (UTC), events are placed relative to this
        now = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # (title, description, location, creator, days from today, start hour, end hour, colour)
        sample_events = [
            ("Date night 🍷", "Dinner at La Maison", "La Maison Restaurant", alice.id, 1, 19, 21, COLORS[0]),
            ("Morning run 🏃", None, "Riverside Park", bob.id, 2, 7, 8, COLORS[4]),
            ("Grocery shopping", "Weekly shop", "Whole Foods", alice.id, 3, 10, 11, COLORS[2]),
            ("Movie night", "Watch the new Marvel film", None, bob.id, 4, 20, 22, COLORS[1]),
            ("Dentist appointment", None, "City Dental Clinic", alice.id, 5, 14, 15, COLORS[3]),
            ("Weekend hike 🏔️", "Trail at Blue Ridge", "Blue Ridge Trail", bob.id, 7, 9, 13, COLORS[4]),
            ("Birthday party 🎂", "Sarah's birthday dinner", "The Grill House", alice.id, 10, 18, 21, COLORS[1]),
            ("Yoga class", None, "Downtown Yoga Studio", bob.id, 12, 8, 9, COLORS[3]),
        ]

        for title, desc, loc, creator_id, day_offset, start_h, end_h, color in sample_events:
            start = now + timedelta(days=day_offset, hours=start_h)
            end = now + timedelta(days=day_offset, hours=end_h)
            db.add(
                Event(
                    id=uuid.uuid4(),
                    couple_id=couple.id,
                    creator_id=creator_id,
                    title=title,
                    description=desc,
                    location=loc,
                    color=color,
                    start_at=start,
                    end_at=end,
                )
            )

        await db.commit()

    print("\n✅ Seed complete!")
    print(f"   Alice: alice@example.com")
    print(f"   Bob:   bob@example.com")
    print(f"   Password (both): {TEST_PASSWORD}")
    print(f"   Couple invite code: TESTXY\n")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
