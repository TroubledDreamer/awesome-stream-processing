'use client';

import { useEffect, useRef, useState } from 'react';

export default function WebSocketClient({ onSnapshot, onUpdate, onStatus }) {
  const [status, setStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  useEffect(() => {
    let reconnectDelay = 1000;

    function connect() {
      setStatus('connecting');
      onStatus?.('connecting');

      const ws = new WebSocket('ws://localhost:8080');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] connected');
        setStatus('connected');
        onStatus?.('connected');

        // Subscribe to RisingWave stream
        ws.send(JSON.stringify({ type: 'subscribe_energy' }));
        reconnectDelay = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'energy_snapshot') {
            onSnapshot?.(msg.data);
          } else if (msg.type === 'energy_update') {
            onUpdate?.(msg.data);
          }
        } catch (err) {
          console.error('[WS] parse error:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] error:', error);
        setStatus('error');
        onStatus?.('error');
      };

      ws.onclose = () => {
        console.warn('[WS] closed');
        setStatus('disconnected');
        onStatus?.('disconnected');

        reconnectRef.current = setTimeout(() => {
          reconnectDelay = Math.min(10000, reconnectDelay * 1.5);
          connect();
        }, reconnectDelay);
      };
    }

    connect();

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [onSnapshot, onUpdate, onStatus]);

  return null;
}