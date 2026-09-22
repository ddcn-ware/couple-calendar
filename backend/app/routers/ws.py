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
    # Extract token from query param (WebSocket can't send headers easily)
    email = decode_access_token(token)
    if not email:
        await websocket.close(code=4001)
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

    if not user or str(user.couple_id) != couple_id:
        await websocket.close(code=4003)
        return

    await manager.connect(couple_id, websocket)
    try:
        while True:
            # Keep the connection alive; we only push from server
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(couple_id, websocket)
