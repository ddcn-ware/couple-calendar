"""
WebSocket connection manager — broadcasts event changes to all
connected clients in the same couple space.
"""
import json
import uuid
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # couple_id (str) → set of WebSockets
        self._connections: dict[str, set[WebSocket]] = {}

    async def connect(self, couple_id: str, ws: WebSocket):
        await ws.accept()
        self._connections.setdefault(couple_id, set()).add(ws)

    def disconnect(self, couple_id: str, ws: WebSocket):
        group = self._connections.get(couple_id, set())
        group.discard(ws)
        if not group:
            self._connections.pop(couple_id, None)

    async def broadcast(self, couple_id: str, payload: dict[str, Any]):
        message = json.dumps(payload, default=str)
        dead: list[WebSocket] = []
        for ws in list(self._connections.get(couple_id, [])):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(couple_id, ws)


manager = ConnectionManager()
