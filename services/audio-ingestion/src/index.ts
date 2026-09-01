import 'dotenv/config';
import express from 'express';
import { Kafka, Producer } from 'kafkajs';
import { logger } from './lib/logger';
import { config, validateConfig } from './config';
import { AgoraChannelBot } from './agora/agoraBot';
import { MockAudioSource } from './audio/mockAudioSource';
import { AudioKafkaProducer } from './kafka/audioProducer';
import { generateUserToken } from './agora/tokenGenerator';

// ─── Validate config ─────────────────────────────────────────
validateConfig();

// ─── Kafka Setup ─────────────────────────────────────────────
const kafka = new Kafka({
  clientId: config.kafkaClientId,
  brokers: config.kafkaBrokers,
  retry: { initialRetryTime: 1000, retries: 8 },
});
const producer = kafka.producer();

// ─── Agora Bot ────────────────────────────────────────────────
const bot = new AgoraChannelBot(producer, config.mockAudioMode);

// Track mock sources per incident
const mockSources = new Map<string, MockAudioSource>();

// ─── Bot Event Handlers ───────────────────────────────────────
bot.on('participantJoined', async ({ incidentId, uid }: { incidentId: string; uid: number }) => {
  const audioKafkaProducer = new AudioKafkaProducer(producer);
  await audioKafkaProducer.publishParticipantJoined(incidentId, uid, producer);
});

bot.on('participantLeft', async ({ incidentId, uid }: { incidentId: string; uid: number }) => {
  const audioKafkaProducer = new AudioKafkaProducer(producer);
  await audioKafkaProducer.publishParticipantLeft(incidentId, uid, producer);
});

// ─── REST API ─────────────────────────────────────────────────
// Internal API consumed by the REST API service when an incident is created/resolved

const app = express();
app.use(express.json());

/**
 * POST /channels/:incidentId/join
 * Called by the REST API when a new incident is declared.
 * Bot joins the channel and starts streaming audio to Kafka.
 */
app.post('/channels/:incidentId/join', async (req, res) => {
  const { incidentId } = req.params;

  try {
    if (bot.isActive(incidentId)) {
      res.status(409).json({ error: 'Already joined', incidentId });
      return;
    }

    await bot.join(incidentId);

    // Start mock audio source if in mock mode
    if (config.mockAudioMode) {
      const audioKafkaProducer = new AudioKafkaProducer(producer);
      const mockSource = new MockAudioSource(incidentId, audioKafkaProducer);
      mockSources.set(incidentId, mockSource);
      await mockSource.start();
    }

    logger.info({ message: 'Bot joined incident channel', incidentId, mockMode: config.mockAudioMode, service: 'ais' });
    res.json({ success: true, incidentId, mockMode: config.mockAudioMode });
  } catch (err) {
    logger.error({ message: 'Failed to join channel', error: (err as Error).message, incidentId, service: 'ais' });
    res.status(500).json({ error: 'Failed to join channel', details: (err as Error).message });
  }
});

/**
 * POST /channels/:incidentId/leave
 * Called when an incident is resolved.
 */
app.post('/channels/:incidentId/leave', async (req, res) => {
  const { incidentId } = req.params;

  try {
    const mockSource = mockSources.get(incidentId);
    if (mockSource) {
      mockSource.stop();
      mockSources.delete(incidentId);
    }

    await bot.leave(incidentId);
    res.json({ success: true, incidentId });
  } catch (err) {
    logger.error({ message: 'Failed to leave channel', error: (err as Error).message, incidentId, service: 'ais' });
    res.status(500).json({ error: 'Failed to leave channel', details: (err as Error).message });
  }
});

/**
 * POST /channels/:incidentId/tts
 * Called by the Voice Synthesis Engine to inject TTS audio into the channel.
 * Body: { pcmBase64: string }  — Base64-encoded 16kHz mono 16-bit PCM
 */
app.post('/channels/:incidentId/tts', async (req, res) => {
  const { incidentId } = req.params;
  const { pcmBase64 } = req.body;

  if (!pcmBase64) {
    res.status(400).json({ error: 'pcmBase64 required' });
    return;
  }

  try {
    const pcmBuffer = Buffer.from(pcmBase64, 'base64');
    await bot.publishTTS(incidentId, pcmBuffer);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to inject TTS', details: (err as Error).message });
  }
});

/**
 * GET /channels/:incidentId/token
 * Returns a short-lived Agora RTC token for a participant joining from the web.
 * The frontend calls this to get a token before joining the Agora channel.
 */
app.get('/channels/:incidentId/token', (req, res) => {
  const { incidentId } = req.params;
  const uid = parseInt(req.query.uid as string || '0', 10);

  try {
    const token = generateUserToken(incidentId, uid);
    res.json({ token, appId: config.appId, channelName: incidentId });
  } catch (err) {
    res.status(500).json({ error: 'Token generation failed', details: (err as Error).message });
  }
});

/**
 * GET /health
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'vaic-audio-ingestion',
    activeIncidents: bot.activeIncidents(),
    mockMode: config.mockAudioMode,
  });
});

// ─── Start ────────────────────────────────────────────────────
async function main() {
  await producer.connect();
  logger.info({ message: 'Kafka producer connected', service: 'ais' });

  app.listen(config.port, () => {
    logger.info({
      message: 'Audio Ingestion Service started',
      port: config.port,
      mockMode: config.mockAudioMode,
      audioPersist: config.audioPersist,
      service: 'ais',
    });
  });
}

async function shutdown() {
  logger.info({ message: 'Shutting down Audio Ingestion Service', service: 'ais' });
  for (const incidentId of bot.activeIncidents()) {
    await bot.leave(incidentId);
  }
  await producer.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
main().catch((err) => {
  logger.error({ message: 'Fatal AIS error', error: err.message, service: 'ais' });
  process.exit(1);
});
