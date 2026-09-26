"""
All the app settings in one place. pydantic-settings reads these from
environment variables (or backend/.env), and falls back to the defaults
below, which are set up for running locally.
"""
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # need two DB urls: the app uses the async driver (asyncpg),
    # but alembic migrations run with the normal sync driver (psycopg2)
    DATABASE_URL: str = "postgresql+asyncpg://couple:couple@localhost:5432/couple_calendar"
    DATABASE_URL_SYNC: str = "postgresql://couple:couple@localhost:5432/couple_calendar"

    # used to sign JWTs - anyone with this can fake a login, so never use the default in prod
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    # leftover from the old magic-link login, not used anymore
    MAGIC_LINK_EXPIRE_MINUTES: int = 15
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    # Comma-separated list of allowed frontend origins
    # e.g. "http://localhost:3000,https://my-frontend.up.railway.app"
    # NOTE: not actually used right now since CORS is set to "*" in main.py
    FRONTEND_URL: str = "http://localhost:3000"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_async_url(cls, v: str) -> str:
        # Railway provides postgres://, SQLAlchemy async needs postgresql+asyncpg://
        v = v.replace("postgres://", "postgresql://")
        if v.startswith("postgresql://") and "+asyncpg" not in v:
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("DATABASE_URL_SYNC", mode="before")
    @classmethod
    def fix_sync_url(cls, v: str) -> str:
        # same idea but the other way - strip asyncpg so psycopg2 can use it
        return v.replace("postgres://", "postgresql://").replace("+asyncpg", "")

    @property
    def allowed_origins(self) -> list[str]:
        return [u.strip() for u in self.FRONTEND_URL.split(",") if u.strip()]


# import this everywhere instead of making new Settings() objects
settings = Settings()
