"use client";
import { useEffect, useRef } from "react";
import { wsUrl } from "@/lib/api";
import type { WsMessage } from "@/lib/types";

export function useCalendarWs(coupleId: string | null, onMessage: (msg: WsMessage) => void) {
  const ws = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!coupleId) return;

    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let closed = false;

    function connect() {
      const url = wsUrl(coupleId!);
      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onmessage = (e) => {
        try {
          const msg: WsMessage = JSON.parse(e.data);
          onMessageRef.current(msg);
        } catch {}
      };

      socket.onclose = () => {
        if (!closed) {
          // Reconnect after 3s on unexpected disconnect
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimeout);
      ws.current?.close();
    };
  }, [coupleId]);
}
