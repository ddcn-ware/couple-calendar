"""
The websocket endpoint. The frontend opens one connection when the calendar
page loads and keeps it open. It's one-way in practice: the server pushes
"event_created/updated/deleted" messages, the browser never sends anything useful.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.core.ws_manager import manager
from app.db.session import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{couple_id}")
async def websocket_endpoint(websocket: WebSocket, couple_id: str, token: str = ""):
    """
    Connect with: ws://localhost:8000/ws/<couple_id>?token=<access_token>
    The token is validated; the user must belong to the specified couple.
    """
    # Extract token from query param (the browser WebSocket API can't set headers).
    # Downside is the token can end up in server logs - ok for this project.
    email = decode_access_token(token)
    if not email:
        await websocket.close(code=4001)  # 4000+ codes are free for apps to use. 4001 = bad token
        return

    # can't use Depends(get_db) the normal way here, so open a session manually
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

    # stops you from listening in on a couple you're not part of
    if not user or str(user.couple_id) != couple_id:
        await websocket.close(code=4003)  # 4003 = not allowed
        return

    await manager.connect(couple_id, websocket)
    try:
        while True:
            # Keep the connection alive; we only push from server.
            # receive_text() just waits here until the client disconnects
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(couple_id, websocket)
