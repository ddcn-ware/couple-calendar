"""
WebSocket connection manager — broadcasts event changes to all
connected clients in the same couple space.

Basically a dict of "rooms": each couple gets a room, and every open browser
tab from that couple is in it. When an event changes, events.py calls
broadcast() and everyone in the room gets the message.

Limitation: this lives in memory, so it only works with ONE backend process.
If the server ran multiple workers they wouldn't see each other's connections
(would need something like Redis pub/sub for that). Fine for 2 users though.
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
        # clean up empty rooms so the dict doesn't grow forever
        if not group:
            self._connections.pop(couple_id, None)

    async def broadcast(self, couple_id: str, payload: dict[str, Any]):
        # default=str so UUIDs and datetimes don't crash json.dumps
        message = json.dumps(payload, default=str)
        dead: list[WebSocket] = []
        # loop over a copy (list(...)) since we might remove sockets
        for ws in list(self._connections.get(couple_id, [])):
            try:
                await ws.send_text(message)
            except Exception:
                # connection died without telling us (closed laptop, lost wifi etc)
                dead.append(ws)
        for ws in dead:
            self.disconnect(couple_id, ws)


# one shared instance for the whole app
manager = ConnectionManager()
