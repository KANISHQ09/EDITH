'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useIncidentStore, StateDelta } from '@/stores/incidentStore';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * useWebSocket — Manages the WebSocket connection to the VAIC WebSocket Gateway.
 * Handles automatic reconnection, JWT auth in the URL params,
 * and routes incoming events to the Zustand store via applyDelta().
 */
export function useWebSocket(incidentId: string, token?: string) {
  const { applyDelta, setWsConnected, addTranscript } = useIncidentStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}/v1/incidents/${incidentId}/stream${token ? `?token=${token}` : ''}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[VAIC WS] Connected to incident', incidentId);
      setWsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'state.delta') {
          applyDelta(msg.data as StateDelta);
        } else if (msg.type === 'new.transcript') {
          addTranscript(msg.data);
        } else if (msg.type === 'replay') {
          // Replay buffer on reconnect — apply all events
          if (Array.isArray(msg.events)) {
            msg.events.forEach((evt: StateDelta) => applyDelta(evt));
          }
        }
      } catch (err) {
        console.error('[VAIC WS] Failed to parse message', err);
      }
    };

    ws.onerror = () => {
      // Only warn if repeated attempts fail
      if (reconnectAttempts.current >= 2) {
        console.warn('[VAIC WS] Backend not reachable. Running in UI-only mode.');
      }
    };

    ws.onclose = (event) => {
      setWsConnected(false);
      wsRef.current = null;

      if (event.code === 4001) {
        console.error('[VAIC WS] Authentication failed — not reconnecting');
        return;
      }

      // Max out at 3 reconnect attempts to prevent infinite spam
      if (reconnectAttempts.current < 3) {
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };
  }, [incidentId, token, applyDelta, setWsConnected, addTranscript]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
      setWsConnected(false);
    };
  }, [connect]);

  return { ws: wsRef.current };
}
