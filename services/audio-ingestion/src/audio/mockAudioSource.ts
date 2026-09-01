import path from 'path';
import fs from 'fs';
import { Producer } from 'kafkajs';
import { logger } from '../lib/logger';
import { config } from '../config';
import { AudioKafkaProducer } from '../kafka/audioProducer';

const MOCK_PARTICIPANTS = [
  { uid: 1, label: 'Incident_Commander' },
  { uid: 2, label: 'Responder_1' },
  { uid: 3, label: 'Responder_2' },
];

/**
 * Mock Audio Source — replays WAV fixtures or generates synthetic PCM silence.
 *
 * Used in local development when MOCK_AUDIO_MODE=true.
 * Simulates Agora frame callbacks at real-time pace (500ms intervals).
 *
 * This lets you run the full pipeline locally without an Agora account:
 *   MOCK_AUDIO_MODE=true npm run dev
 *
 * WAV files expected at: ./fixtures/audio/{Speaker_UID}.wav
 * If no fixture found, publishes silence (all-zero PCM).
 */
export class MockAudioSource {
  private incidentId: string;
  private producer: AudioKafkaProducer;
  private running = false;
  private timers: NodeJS.Timeout[] = [];

  constructor(incidentId: string, kafkaProducer: AudioKafkaProducer) {
    this.incidentId = incidentId;
    this.producer = kafkaProducer;
  }

  async start(): Promise<void> {
    this.running = true;
    logger.info({
      message: 'Mock audio source started',
      incidentId: this.incidentId,
      participants: MOCK_PARTICIPANTS.map(p => p.label),
      chunkIntervalMs: config.chunkDurationMs,
      service: 'ais',
    });

    for (const participant of MOCK_PARTICIPANTS) {
      this._scheduleParticipant(participant.uid, participant.label);
    }
  }

  private _scheduleParticipant(uid: number, label: string): void {
    // Load fixture WAV if available, otherwise use silence
    const fixturePath = path.join(config.mockAudioDir, `${label}.wav`);
    let fixtureBuffer: Buffer | null = null;
    let fixtureOffset = 0;

    if (fs.existsSync(fixturePath)) {
      fixtureBuffer = fs.readFileSync(fixturePath);
      // Skip WAV header (44 bytes standard) to get raw PCM
      fixtureOffset = 44;
      logger.info({
        message: `Loaded mock audio fixture`,
        label,
        bytes: fixtureBuffer.length,
        service: 'ais',
      });
    }

    // 500ms of 16kHz mono 16-bit PCM = 16000 bytes
    const chunkBytes = config.sampleRate * (config.chunkDurationMs / 1000) * 2;

    const tick = () => {
      if (!this.running) return;

      let chunk: Buffer;

      if (fixtureBuffer && fixtureOffset < fixtureBuffer.length) {
        const end = Math.min(fixtureOffset + chunkBytes, fixtureBuffer.length);
        chunk = fixtureBuffer.slice(fixtureOffset, end);
        fixtureOffset = end;

        // Pad to expected size if at end of file
        if (chunk.length < chunkBytes) {
          const padded = Buffer.alloc(chunkBytes, 0);
          chunk.copy(padded);
          chunk = padded;
          // Loop back to start for continuous playback
          fixtureOffset = 44;
        }
      } else {
        // Silence — 500ms of zeros (triggers VAD skip in transcription engine)
        chunk = Buffer.alloc(chunkBytes, 0);
      }

      this.producer.publishChunk({
        participantUid: uid,
        incidentId: this.incidentId,
        buffer: chunk,
        timestamp: new Date().toISOString(),
        durationMs: config.chunkDurationMs,
      }).catch((err) => {
        logger.error({
          message: 'Failed to publish mock audio chunk',
          error: err.message,
          service: 'ais',
        });
      });

      const timer = setTimeout(tick, config.chunkDurationMs);
      this.timers.push(timer);
    };

    // Stagger participant starts slightly to simulate realistic arrival
    const staggerMs = uid * 200;
    const startTimer = setTimeout(tick, staggerMs);
    this.timers.push(startTimer);
  }

  stop(): void {
    this.running = false;
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    logger.info({ message: 'Mock audio source stopped', incidentId: this.incidentId, service: 'ais' });
  }
}
