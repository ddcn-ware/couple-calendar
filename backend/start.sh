#!/bin/sh
# Production start script: update the database tables, then start the API.
# set -e = stop if migrations fail, so we don't start the server against a broken db
set -e
echo "Running migrations..."
alembic upgrade head
echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
