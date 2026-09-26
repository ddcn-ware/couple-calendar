"""Database connection setup."""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# the engine manages the actual connection pool to postgres
engine = create_async_engine(settings.DATABASE_URL, echo=False)  # echo=True prints every SQL query, useful for debugging
# expire_on_commit=False so we can still read object attributes after commit()
# (otherwise async sqlalchemy tries to reload them and throws an error)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


# all the models in models.py inherit from this
class Base(DeclarativeBase):
    pass


# FastAPI dependency - gives each request its own session and closes it after
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
