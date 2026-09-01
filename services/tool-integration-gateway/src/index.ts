import 'dotenv/config';
import { Kafka, Producer, Consumer } from 'kafkajs';
import express from 'express';
import { logger } from './lib/logger';
import { config } from './config';
import { executeToolAction } from './integrations';
import { KAFKA_TOPICS } from '@vaic/shared';

const kafka = new Kafka({
  clientId: config.kafkaClientId,
  brokers: config.kafkaBrokers,
  retry: { initialRetryTime: 1000, retries: 8 },
});

const producer: Producer = kafka.producer();
const consumer: Consumer = kafka.consumer({ groupId: config.kafkaGroupId });

// ─── Confirmation Gate ────────────────────────────────────────
// Pending actions waiting for IC confirmation
const pendingActions = new Map<string, {
  incidentId: string;
  tool: string;
  actionType: string;
  payload: Record<string, unknown>;
  proposedAt: Date;
}>();

// ─── Kafka Consumer ───────────────────────────────────────────

async function startConsumer() {
  await consumer.subscribe({ topics: [KAFKA_TOPICS.TOOL_PROPOSALS], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const event = JSON.parse(message.value.toString());
        const { incidentId, deltaType, payload } = event;

        if (deltaType === 'TOOL_ACTION_PROPOSED') {
          const actionId = payload.proposalId as string;

          // Store in pending map — waiting for IC confirmation from dashboard
          pendingActions.set(actionId, {
            incidentId,
            tool: payload.tool as string,
            actionType: payload.actionType as string,
            payload: (payload.payload as Record<string, unknown>) || {},
            proposedAt: new Date(),
          });

          logger.info({
            message: 'Tool action pending IC confirmation',
            actionId,
            tool: payload.tool,
            actionType: payload.actionType,
            incidentId,
            service: 'tig',
          });
        }
      } catch (err) {
        logger.error({ message: 'TIG consumer error', error: (err as Error).message, service: 'tig' });
      }
    },
  });
}

// ─── REST API (called by the main REST API service) ──────────

const app = express();
app.use(express.json());

/**
 * POST /tool-actions/:actionId/confirm
 * Called by the REST API when IC confirms a tool action.
 */
app.post('/tool-actions/:actionId/confirm', async (req, res) => {
  const { actionId } = req.params;
  const action = pendingActions.get(actionId);

  if (!action) {
    res.status(404).json({ error: 'Tool action not found or already processed' });
    return;
  }

  pendingActions.delete(actionId);

  try {
    const result = await executeToolAction(action.tool, action.actionType, action.payload);

    const deltaType = result.success ? 'TOOL_ACTION_EXECUTED' : 'TOOL_ACTION_FAILED';

    // Publish result delta
    await producer.send({
      topic: KAFKA_TOPICS.STATE_DELTAS,
      messages: [{
        key: action.incidentId,
        value: JSON.stringify({
          incidentId: action.incidentId,
          deltaType,
          payload: {
            toolActionId: actionId,
            tool: action.tool,
            actionType: action.actionType,
            result: result.data,
            error: result.error,
            executedAt: new Date().toISOString(),
          },
          version: 0,
          timestamp: new Date().toISOString(),
        }),
      }],
    });

    // Audit log
    await producer.send({
      topic: KAFKA_TOPICS.AUDIT_EVENTS,
      messages: [{
        key: action.incidentId,
        value: JSON.stringify({
          incidentId: action.incidentId,
          eventType: deltaType,
          actorId: req.body.confirmedBy || 'SYSTEM',
          details: { actionId, tool: action.tool, actionType: action.actionType, success: result.success },
          timestamp: new Date().toISOString(),
        }),
      }],
    });

    logger.info({
      message: `Tool action ${result.success ? 'executed' : 'failed'}`,
      actionId,
      tool: action.tool,
      result: result.success,
      service: 'tig',
    });

    res.json({ success: result.success, data: result.data, error: result.error });
  } catch (err) {
    logger.error({ message: 'Tool action execution error', error: (err as Error).message, actionId, service: 'tig' });
    res.status(500).json({ error: 'Execution failed', details: (err as Error).message });
  }
});

/**
 * POST /tool-actions/:actionId/reject
 */
app.post('/tool-actions/:actionId/reject', async (req, res) => {
  const { actionId } = req.params;
  const action = pendingActions.get(actionId);

  if (!action) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  pendingActions.delete(actionId);

  await producer.send({
    topic: KAFKA_TOPICS.STATE_DELTAS,
    messages: [{
      key: action.incidentId,
      value: JSON.stringify({
        incidentId: action.incidentId,
        deltaType: 'TOOL_ACTION_REJECTED',
        payload: { toolActionId: actionId, rejectedBy: req.body.rejectedBy || 'IC', rejectedAt: new Date().toISOString() },
        version: 0,
        timestamp: new Date().toISOString(),
      }),
    }],
  });

  res.json({ success: true });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'vaic-tool-integration-gateway',
    pendingActions: pendingActions.size,
    enabledIntegrations: {
      slack: config.slackEnabled,
      jira: config.jiraEnabled,
      pagerduty: config.pagerdutyEnabled,
    },
  });
});

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  await producer.connect();
  await consumer.connect();
  await startConsumer();

  app.listen(config.port, () => {
    logger.info({
      message: 'Tool Integration Gateway started',
      port: config.port,
      slack: config.slackEnabled,
      jira: config.jiraEnabled,
      pagerduty: config.pagerdutyEnabled,
      service: 'tig',
    });
  });
}

async function shutdown() {
  logger.info({ message: 'Shutting down TIG', service: 'tig' });
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
main().catch((err) => {
  logger.error({ message: 'Fatal TIG error', error: err.message, service: 'tig' });
  process.exit(1);
});
