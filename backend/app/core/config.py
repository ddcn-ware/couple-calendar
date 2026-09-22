from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://couple:couple@localhost:5432/couple_calendar"
    DATABASE_URL_SYNC: str = "postgresql://couple:couple@localhost:5432/couple_calendar"
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    MAGIC_LINK_EXPIRE_MINUTES: int = 15
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    # Comma-separated list of allowed frontend origins
    # e.g. "http://localhost:3000,https://my-frontend.up.railway.app"
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
        return v.replace("postgres://", "postgresql://").replace("+asyncpg", "")

    @property
    def allowed_origins(self) -> list[str]:
        return [u.strip() for u in self.FRONTEND_URL.split(",") if u.strip()]


settings = Settings()
