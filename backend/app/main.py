"""
Entry point for the backend. uvicorn loads `app` from here
(see start.sh / docker-compose.yml).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, couples, events, ws

app = FastAPI(title="Couple Calendar API", version="1.0.0")

# CORS lets the frontend (different domain/port) call this API from the browser.
# Right now it's open to all origins ("*"). This is ok-ish because we use Bearer
# tokens not cookies (allow_credentials=False), but it should really be tightened
# to settings.allowed_origins (built from FRONTEND_URL) at some point.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# each router is a group of related endpoints (see app/routers/)
app.include_router(auth.router)
app.include_router(couples.router)
app.include_router(events.router)
app.include_router(ws.router)


# Railway pings this to check the server is alive (healthcheckPath in railway.toml)
@app.get("/health")
async def health():
    return {"status": "ok"}
