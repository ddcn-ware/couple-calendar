"""
Alembic config - runs every time you do `alembic upgrade head`.
Mostly the default alembic template, the only real change is reading the
database url from env vars so it works both locally and on Railway.
"""
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make sure our app is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.session import Base  # noqa: E402
import app.models.models  # noqa: F401, E402 — registers all models

config = context.config

# Override sqlalchemy.url from environment if set
# Railway injects DATABASE_URL as postgres:// — convert to postgresql://
db_url = os.getenv("DATABASE_URL_SYNC") or os.getenv("DATABASE_URL", "")
db_url = db_url.replace("postgres://", "postgresql://").replace("+asyncpg", "")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
