
import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketManagerOptions {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  enabled?: boolean;
}

export function useOptimizedWebSocket(
  url: string,
  options: WebSocketManagerOptions = {}
) {
  const {
    maxReconnectAttempts = 3,
    reconnectDelay = 5000,
    heartbeatInterval = 30000,
    enabled = true
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!enabled || ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectCount.current = 0;
        
        // Heartbeat para manter conexão viva
        heartbeatRef.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'PING' }));
          }
        }, heartbeatInterval);
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }

        // Reconexão inteligente
        if (reconnectCount.current < maxReconnectAttempts && enabled) {
          setTimeout(() => {
            reconnectCount.current++;
            connect();
          }, reconnectDelay * Math.pow(2, reconnectCount.current)); // Backoff exponencial
        }
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    }
  }, [url, enabled, maxReconnectAttempts, reconnectDelay, heartbeatInterval]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect, enabled]);

  return {
    isConnected,
    websocket: ws.current,
    reconnect: connect
  };
}
