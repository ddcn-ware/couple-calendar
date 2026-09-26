"use client";
import { useEffect, useRef } from "react";
import { wsUrl } from "@/lib/api";
import type { WsMessage } from "@/lib/types";

// Opens a websocket to the backend so we hear about event changes live
// (mostly the ones your partner makes). Calls onMessage for every message.
export function useCalendarWs(coupleId: string | null, onMessage: (msg: WsMessage) => void) {
  const ws = useRef<WebSocket | null>(null);
  // keep the latest onMessage in a ref so we don't have to reconnect
  // every time the parent re-renders and passes a new function
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!coupleId) return;

    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let closed = false; // true when WE closed it (leaving the page), so don't reconnect

    function connect() {
      const url = wsUrl(coupleId!);
      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onmessage = (e) => {
        try {
          const msg: WsMessage = JSON.parse(e.data);
          onMessageRef.current(msg);
        } catch {} // ignore anything that isn't valid json
      };

      socket.onclose = () => {
        if (!closed) {
          // Reconnect after 3s on unexpected disconnect
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    // cleanup when the component unmounts or coupleId changes
    return () => {
      closed = true;
      clearTimeout(reconnectTimeout);
      ws.current?.close();
    };
  }, [coupleId]);
}
