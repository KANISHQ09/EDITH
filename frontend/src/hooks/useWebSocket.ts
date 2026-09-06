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
export function useWebSocket(
  incidentId: string,
  token?: string,
  onSignal?: (signal: any) => void,
  onMessage?: (msg: any) => void
) {
  const { applyDelta, setWsConnected, addTranscript, setSpeaking } = useIncidentStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Store callbacks and store actions in refs to prevent connect() recreation on every render
  const onSignalRef = useRef(onSignal);
  onSignalRef.current = onSignal;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const applyDeltaRef = useRef(applyDelta);
  applyDeltaRef.current = applyDelta;
  const addTranscriptRef = useRef(addTranscript);
  addTranscriptRef.current = addTranscript;
  const setSpeakingRef = useRef(setSpeaking);
  setSpeakingRef.current = setSpeaking;
  const setWsConnectedRef = useRef(setWsConnected);
  setWsConnectedRef.current = setWsConnected;

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const connect = useCallback(() => {
    if (!incidentId) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const url = `${WS_URL}/v1/incidents/${incidentId}/stream${token ? `?token=${token}` : ''}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.warn('[VAIC WS] Failed to instantiate WebSocket:', e);
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) {
        try {
          ws.close(1000, 'Component unmounted');
        } catch (_) {}
        return;
      }
      console.log('[VAIC WS] Connected to incident', incidentId);
      setWsConnectedRef.current(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'state.delta') {
          applyDeltaRef.current(msg.data as StateDelta);
        } else if (msg.type === 'new.transcript') {
          addTranscriptRef.current(msg.data);
        } else if (msg.type === 'replay') {
          // Replay buffer on reconnect — apply all events
          if (Array.isArray(msg.events)) {
            msg.events.forEach((evt: StateDelta) => applyDeltaRef.current(evt));
          }
        } else if (msg.type === 'user.speaking') {
          const speaker = msg.speakerLabel || msg.userName || msg.participantId || msg.senderId;
          if (speaker) {
            setSpeakingRef.current(speaker, !!msg.isSpeaking);
          }
        } else if (msg.type === 'presence.join') {
          const p = msg.participant || {};
          applyDeltaRef.current({
            incidentId,
            deltaType: 'PARTICIPANT_JOINED',
            payload: {
              id: p.id || msg.senderId,
              incidentId,
              speakerLabel: p.speakerLabel || msg.userName || 'Responder',
              role: p.role || msg.userRole || 'RESPONDER',
              joinedAt: new Date().toISOString(),
            },
            version: 1,
            timestamp: new Date().toISOString(),
          });
        } else if (msg.type === 'presence.leave') {
          applyDeltaRef.current({
            incidentId,
            deltaType: 'PARTICIPANT_LEFT',
            payload: {
              id: msg.participantId || msg.userId || msg.senderId,
              participantId: msg.participantId,
              speakerLabel: msg.speakerLabel || msg.userName,
              userName: msg.userName || msg.speakerLabel,
            },
            version: 1,
            timestamp: new Date().toISOString(),
          });
        } else if (msg.type === 'chat.message') {
          addTranscriptRef.current({
            id: msg.id || `chat-${Date.now()}`,
            speakerName: msg.senderName || msg.speakerName || 'Responder',
            speakerRole: msg.speakerRole || 'RESPONDER',
            content: msg.content || msg.text || '',
            startTs: msg.timestamp || new Date().toISOString(),
            confidence: 1.0,
            classification: 'FACT',
          });
        } else if (msg.type === 'signal') {
          onSignalRef.current?.(msg);
        }

        // Invoke custom listener for knock/approval/custom messages
        onMessageRef.current?.(msg);
      } catch (err) {
        console.error('[VAIC WS] Failed to parse message', err);
      }
    };

    ws.onerror = () => {
      if (!isMountedRef.current) return;
      // Only warn if repeated attempts fail
      if (reconnectAttempts.current >= 2) {
        console.warn('[VAIC WS] Backend not reachable. Running in UI-only mode.');
      }
    };

    ws.onclose = (event) => {
      if (!isMountedRef.current) return;
      setWsConnectedRef.current(false);
      wsRef.current = null;

      if (event.code === 4001 || event.code === 1000) {
        return;
      }

      // Max out at MAX_RECONNECT_ATTEMPTS attempts with exponential backoff
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        const delay = Math.min(RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts.current - 1), 15000);
        reconnectTimer.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, delay);
      }
    };
  }, [incidentId, token]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.close(1000, 'Component unmounted');
          } catch (_) {}
        } else if (ws.readyState === WebSocket.CONNECTING) {
          // Avoid browser error "WebSocket is closed before the connection is established."
          // Defer closing until after connection is established.
          ws.onopen = () => {
            try {
              ws.close(1000, 'Component unmounted');
            } catch (_) {}
          };
        }
      }
      setWsConnected(false);
    };
  }, [connect, setWsConnected]);

  return { ws: wsRef.current, sendMessage };
}

