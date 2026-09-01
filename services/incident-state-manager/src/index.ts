import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();
import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './lib/logger';
import {
  ClassificationRecord,
  ClassificationRecordSchema,
  StateDeltaMessage,
  StateDeltaMessageSchema,
  KAFKA_TOPICS,
  incidentTopic,
  CLASSIFICATION_TYPE,
  WS_EVENTS,
} from '@vaic/shared';
import { getPool, withTransaction, query } from './db/pool';
import { buildStateDelta } from './state/mutations';

const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:9092';
const GROUP_ID = process.env.KAFKA_GROUP_ID_ISM || 'vaic-ism-group';
const MESSAGE_BROKER = process.env.MESSAGE_BROKER || 'redis';

let kafka: Kafka | null = null;
let consumer: Consumer | null = null;
let producer: Producer | null = null;
let redis: RedisClientType;
let redisSub: RedisClientType | null = null;

// ─── Redis State Cache Keys ───────────────────────────────────
const incidentStateKey = (id: string) => `vaic:state:${id}`;
const CACHE_TTL_S = 60 * 60 * 24; // 24 hours (incident duration)

async function main() {
  logger.info({ message: 'Starting Incident State Manager', service: 'incident-state-manager' });

  // Connect Redis
  redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: { connectTimeout: 15000 },
  });
  redis.on('error', (err) => logger.error({ message: 'Redis error', error: err.message, service: 'ism' }));
  await redis.connect();
  logger.info({ message: 'Redis connected', service: 'ism' });

  // Setup Messaging (Redis Pub/Sub or Kafka)
  if (MESSAGE_BROKER === 'redis') {
    logger.info({ message: 'Using Redis Pub/Sub for Incident State Manager', service: 'ism' });
    redisSub = redis.duplicate();
    await redisSub.connect();

    await redisSub.subscribe([KAFKA_TOPICS.CLASSIFICATIONS, KAFKA_TOPICS.AUDIT_EVENTS], async (message, channel) => {
      try {
        const raw = JSON.parse(message);
        if (channel === KAFKA_TOPICS.CLASSIFICATIONS) {
          await handleClassification(raw);
        }
      } catch (err) {
        logger.error({ message: 'Failed to process Redis message', error: (err as Error).message, service: 'ism' });
      }
    });

    logger.info({ message: 'Redis Pub/Sub subscribed to topics', topics: [KAFKA_TOPICS.CLASSIFICATIONS, KAFKA_TOPICS.AUDIT_EVENTS], service: 'ism' });
  } else {
    // Setup Kafka
    kafka = new Kafka({
      clientId: 'vaic-incident-state-manager',
      brokers: KAFKA_BROKERS.split(','),
      retry: { initialRetryTime: 1000, retries: 8 },
    });

    producer = kafka.producer();
    await producer.connect();

    consumer = kafka.consumer({ groupId: GROUP_ID });
    await consumer.connect();

    await consumer.subscribe({
      topics: [KAFKA_TOPICS.CLASSIFICATIONS, KAFKA_TOPICS.AUDIT_EVENTS],
      fromBeginning: false,
    });

    logger.info({ message: 'Kafka consumer subscribed', topics: [KAFKA_TOPICS.CLASSIFICATIONS], service: 'ism' });

    await consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, message } = payload;
        if (!message.value) return;

        try {
          const raw = JSON.parse(message.value.toString());

          if (topic === KAFKA_TOPICS.CLASSIFICATIONS) {
            await handleClassification(raw);
          }
        } catch (err) {
          logger.error({
            message: 'Failed to process Kafka message',
            topic,
            error: (err as Error).message,
            service: 'ism',
          });
        }
      },
    });
  }

  logger.info({ message: 'Incident State Manager ready', service: 'ism' });
}

/**
 * Handles a single classification message:
 * 1. Validate against Zod schema
 * 2. Persist to PostgreSQL in a transaction (classification + typed item)
 * 3. Invalidate Redis state cache
 * 4. Broadcast state delta via Message Broker for WebSocket Gateway
 */
async function handleClassification(raw: unknown) {
  const parseResult = ClassificationRecordSchema.safeParse(raw);
  if (!parseResult.success) {
    logger.warn({
      message: 'Invalid classification record schema',
      errors: parseResult.error.flatten(),
      service: 'ism',
    });
    return;
  }

  const classification: ClassificationRecord = parseResult.data;
  const { incidentId, type } = classification;

  // Skip SOCIAL utterances — not incident-relevant
  if (type === CLASSIFICATION_TYPE.SOCIAL) return;

  logger.info({
    message: 'Processing classification',
    incidentId,
    type,
    confidence: classification.confidence,
    summary: classification.summary?.slice(0, 60),
    service: 'ism',
  });

  await withTransaction(async (client) => {
    // 1. Insert classification record
    await client.query(
      `INSERT INTO classifications (
        id, transcript_entry_id, incident_id, type, confidence,
        summary, entities, action_item_owner, requires_followup
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING`,
      [
        classification.id,
        classification.transcriptEntryId || null,
        classification.incidentId,
        classification.type,
        classification.confidence,
        classification.summary || null,
        JSON.stringify(classification.entities),
        classification.actionItemOwner || null,
        classification.requiresFollowup,
      ]
    );

    // 2. Insert into the appropriate typed registry table
    const deltaType = await applyClassificationToState(client, classification);

    // 3. Write to audit log
    await client.query(
      `INSERT INTO audit_log (incident_id, event_type, actor_type, payload)
       VALUES ($1, $2, 'VAIC_SYSTEM', $3)`,
      [
        incidentId,
        `CLASSIFICATION_${type}`,
        JSON.stringify({
          classificationId: classification.id,
          type,
          summary: classification.summary,
        }),
      ]
    );

    // 4. Publish state delta to Message Broker for WebSocket Gateway fan-out
    const delta = buildStateDelta(incidentId, deltaType, classification);
    const payload = JSON.stringify(delta);

    if (MESSAGE_BROKER === 'redis') {
      await redis.publish(`${KAFKA_TOPICS.STATE_DELTAS}.${incidentId}`, payload);
      await redis.publish(KAFKA_TOPICS.STATE_DELTAS, payload);
    } else if (producer) {
      await producer.send({
        topic: `${KAFKA_TOPICS.STATE_DELTAS}.${incidentId}`,
        messages: [{
          key: incidentId,
          value: payload,
        }],
      });

      await producer.send({
        topic: KAFKA_TOPICS.STATE_DELTAS,
        messages: [{
          key: incidentId,
          value: payload,
        }],
      });
    }
  });

  // 5. Invalidate Redis cache so next read rebuilds from DB
  await redis.del(incidentStateKey(incidentId));
}

/**
 * Write the classification record to the appropriate registry table.
 * Returns the delta type string for downstream consumers.
 */
async function applyClassificationToState(
  client: import('pg').PoolClient,
  classification: ClassificationRecord
): Promise<StateDeltaMessage['deltaType']> {
  const { incidentId, type, summary, entities, id } = classification;

  switch (type) {
    case CLASSIFICATION_TYPE.FACT: {
      await client.query(
        `INSERT INTO facts (id, incident_id, content, source_classification_id, status)
         VALUES ($1, $2, $3, $4, 'CONFIRMED')
         ON CONFLICT DO NOTHING`,
        [uuidv4(), incidentId, summary, id]
      );
      return 'FACT_ADDED';
    }

    case CLASSIFICATION_TYPE.HYPOTHESIS: {
      await client.query(
        `INSERT INTO hypotheses (id, incident_id, content, source_classification_id, status)
         VALUES ($1, $2, $3, $4, 'PENDING')
         ON CONFLICT DO NOTHING`,
        [uuidv4(), incidentId, summary, id]
      );
      return 'HYPOTHESIS_ADDED';
    }

    case CLASSIFICATION_TYPE.DECISION: {
      await client.query(
        `INSERT INTO decisions (id, incident_id, content, source_classification_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [uuidv4(), incidentId, summary, id]
      );
      return 'DECISION_ADDED';
    }

    case CLASSIFICATION_TYPE.ACTION_ITEM: {
      await client.query(
        `INSERT INTO action_items (id, incident_id, content, source_classification_id, status)
         VALUES ($1, $2, $3, $4, 'PENDING')
         ON CONFLICT DO NOTHING`,
        [uuidv4(), incidentId, summary, id]
      );
      return 'ACTION_ITEM_ADDED';
    }

    case CLASSIFICATION_TYPE.QUESTION: {
      await client.query(
        `INSERT INTO questions (id, incident_id, content, source_classification_id, status)
         VALUES ($1, $2, $3, $4, 'PENDING')
         ON CONFLICT DO NOTHING`,
        [uuidv4(), incidentId, summary, id]
      );
      return 'QUESTION_ADDED';
    }

    case CLASSIFICATION_TYPE.STATUS_UPDATE: {
      // Status updates go to the timeline only
      return 'TIMELINE_ENTRY_ADDED';
    }

    default:
      return 'TIMELINE_ENTRY_ADDED';
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────
async function shutdown() {
  logger.info({ message: 'Shutting down Incident State Manager', service: 'ism' });
  if (consumer) await consumer.disconnect();
  if (producer) await producer.disconnect();
  if (redisSub) await redisSub.disconnect();
  if (redis) await redis.quit();
  await getPool().end();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

main().catch((err) => {
  logger.error({ message: 'Fatal error in ISM', error: err.message, stack: err.stack, service: 'ism' });
  process.exit(1);
});
