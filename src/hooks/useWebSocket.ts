import { useEffect, useRef, useCallback, useState } from 'react';
import type { WsMessage } from '../types/api';

type MessageHandler = (msg: WsMessage) => void;

export function useWebSocket(token: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const [notifications, setNotifications] = useState<WsMessage[]>([]);
  const handlers = useRef<Map<string, MessageHandler[]>>(new Map());

  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    if (!handlers.current.has(type)) handlers.current.set(type, []);
    handlers.current.get(type)!.push(handler);
    return () => {
      const list = handlers.current.get(type);
      if (list) handlers.current.set(type, list.filter((h) => h !== handler));
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws?token=${token}`;
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        setNotifications((prev) => [msg, ...prev].slice(0, 50));
        const list = handlers.current.get(msg.type);
        if (list) list.forEach((h) => h(msg));
      } catch { /* ignore parse errors */ }
    };

    socket.onclose = () => {
      setTimeout(() => {
        if (ws.current === socket) ws.current = null;
      }, 3000);
    };

    return () => { socket.close(); };
  }, [token]);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  return { notifications, subscribe, clearNotifications };
}
