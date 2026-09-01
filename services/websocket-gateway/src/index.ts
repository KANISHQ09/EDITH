import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verify } from 'jsonwebtoken';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './lib/logger';
import { KAFKA_TOPICS, DEFAULTS } from '@vaic/shared';

const PORT = parseInt(process.env.WSG_PORT || '3002', 10);
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:9092';
const GROUP_ID = process.env.KAFKA_GROUP_ID_WSG || 'vaic-wsg-group';
const JWT_SECRET = process.env.JWT_SECRET || 'vaic-dev-jwt-secret-minimum-32-chars-key-here';
const MESSAGE_BROKER = process.env.MESSAGE_BROKER || 'redis';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ─── Client Registry ─────────────────────────────────────────
// incidentId → Map<clientId, WebSocket>
const clients = new Map<string, Map<string, WebSocket>>();

// Per-client event replay buffer: last 100 events per incident
const eventBuffer = new Map<string, object[]>();
const MAX_REPLAY_EVENTS = DEFAULTS.WEBSOCKET_REPLAY_COUNT;

// ─── WebSocket Server ────────────────────────────────────────
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url!, `ws://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean);
  const streamIdx = parts.indexOf('stream');
  const incidentId = streamIdx > 0 ? parts[streamIdx - 1] : parts.pop();
  const token = url.searchParams.get('token');

  // Validate JWT (Allow dev/demo bypass)
  let userId = 'dev-user';
  if (token) {
    try {
      const decoded = verify(token, JWT_SECRET) as { sub: string };
      userId = decoded.sub;
    } catch {
      if (process.env.NODE_ENV === 'production') {
        ws.close(4001, 'Unauthorized: invalid token');
        return;
      }
    }
  }

  if (!incidentId) {
    ws.close(4000, 'Bad request: incident ID required in path');
    return;
  }

  const clientId = uuidv4();

  // Register client
  if (!clients.has(incidentId)) {
    clients.set(incidentId, new Map());
  }
  clients.get(incidentId)!.set(clientId, ws);

  logger.info({
    message: 'WebSocket client connected',
    incidentId,
    clientId,
    userId,
    totalClients: clients.get(incidentId)!.size,
    service: 'wsg',
  });

  // Replay last N events for late joiners (SRS §9.2)
  const buffered = eventBuffer.get(incidentId) || [];
  if (buffered.length > 0) {
    ws.send(JSON.stringify({ type: 'replay', events: buffered.slice(-MAX_REPLAY_EVENTS) }));
  }

  // Heartbeat (30s ping/pong per SRS §9.2)
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, DEFAULTS.WEBSOCKET_HEARTBEAT_MS);

  ws.on('pong', () => {
    // Client is alive
  });

  ws.on('close', () => {
    clearInterval(heartbeat);
    clients.get(incidentId)?.delete(clientId);
    logger.info({
      message: 'WebSocket client disconnected',
      incidentId,
      clientId,
      service: 'wsg',
    });
  });

  ws.on('error', (err) => {
    logger.error({ message: 'WebSocket error', error: err.message, clientId, service: 'wsg' });
  });
});

logger.info({ message: 'WebSocket Gateway started', port: PORT, service: 'wsg' });

// ─── Dispatch helper ─────────────────────────────────────────
function dispatchStateDelta(delta: any) {
  const incidentId = delta.incidentId;
  if (!incidentId) return;

  // Buffer for replay
  if (!eventBuffer.has(incidentId)) {
    eventBuffer.set(incidentId, []);
  }
  const buffer = eventBuffer.get(incidentId)!;
  buffer.push(delta);
  if (buffer.length > MAX_REPLAY_EVENTS) {
    buffer.shift();
  }

  // Fan out to all connected clients for this incident
  const incidentClients = clients.get(incidentId);
  if (!incidentClients || incidentClients.size === 0) return;

  const payload = JSON.stringify({ type: 'state.delta', data: delta });
  let sent = 0;

  for (const [clientId, ws] of incidentClients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      sent++;
    } else {
      incidentClients.delete(clientId);
    }
  }

  if (sent > 0) {
    logger.debug({
      message: 'State delta broadcast',
      incidentId,
      deltaType: delta.deltaType,
      clientCount: sent,
      service: 'wsg',
    });
  }
}

function broadcastToIncident(incidentId: string, message: any) {
  const incidentClients = clients.get(incidentId);
  if (!incidentClients || incidentClients.size === 0) return;

  const payload = JSON.stringify(message);
  for (const [clientId, ws] of incidentClients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    } else {
      incidentClients.delete(clientId);
    }
  }
}

// ─── Message Broker (Redis or Kafka) ─────────────────────────
let redisClient: ReturnType<typeof createClient> | null = null;
let kafkaConsumer: Consumer | null = null;

async function startConsumer() {
  if (MESSAGE_BROKER === 'redis') {
    logger.info({ message: 'Using Redis Pub/Sub for WebSocket Gateway', service: 'wsg' });
    redisClient = createClient({
      url: REDIS_URL,
      socket: { connectTimeout: 15000 },
    });
    redisClient.on('error', (err) => {
      logger.error({ message: 'Redis subscriber error', error: err.message, service: 'wsg' });
    });
    await redisClient.connect();

    await redisClient.subscribe(KAFKA_TOPICS.STATE_DELTAS, (message) => {
      try {
        const delta = JSON.parse(message);
        dispatchStateDelta(delta);
      } catch (err) {
        logger.error({ message: 'Failed to parse Redis state delta', error: (err as Error).message, service: 'wsg' });
      }
    });
    logger.info({ message: 'Subscribed to Redis topic', topic: KAFKA_TOPICS.STATE_DELTAS, service: 'wsg' });

    await redisClient.subscribe('new.transcript', (message) => {
      try {
        const payload = JSON.parse(message);
        const { incidentId, data } = payload;
        broadcastToIncident(incidentId, {
          type: 'new.transcript',
          data,
        });
      } catch (err) {
        logger.error({ message: 'Failed to parse Redis new.transcript', error: (err as Error).message, service: 'wsg' });
      }
    });
    logger.info({ message: 'Subscribed to Redis topic', topic: 'new.transcript', service: 'wsg' });
  } else {
    logger.info({ message: 'Starting Kafka consumer for WebSocket Gateway', service: 'wsg' });
    const kafka = new Kafka({
      clientId: 'vaic-websocket-gateway',
      brokers: KAFKA_BROKERS.split(','),
      retry: { initialRetryTime: 1000, retries: 8 },
    });

    kafkaConsumer = kafka.consumer({ groupId: GROUP_ID });
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({
      topic: KAFKA_TOPICS.STATE_DELTAS,
      fromBeginning: false,
    });

    await kafkaConsumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        if (!message.value) return;
        try {
          const delta = JSON.parse(message.value.toString());
          dispatchStateDelta(delta);
        } catch (err) {
          logger.error({ message: 'Failed to parse Kafka state delta', error: (err as Error).message, service: 'wsg' });
        }
      },
    });
  }
}

startConsumer().catch((err) => {
  logger.error({ message: 'Message consumer failed to start', error: err.message, service: 'wsg' });
});

// ─── Graceful Shutdown ────────────────────────────────────────
async function shutdown() {
  logger.info({ message: 'Shutting down WebSocket Gateway', service: 'wsg' });
  wss.close();
  if (redisClient) await redisClient.disconnect();
  if (kafkaConsumer) await kafkaConsumer.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
