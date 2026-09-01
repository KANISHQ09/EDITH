import { EventEmitter } from 'events';
import { Kafka, Producer } from 'kafkajs';
import { logger } from '../lib/logger';
import { config } from '../config';
import { generateBotToken } from '../agora/tokenGenerator';
import { AgoraCloudRecorder } from '../agora/cloudRecorder';
import { AudioBuffer } from '../audio/audioBuffer';
import { AudioKafkaProducer } from '../kafka/audioProducer';

/**
 * AgoraChannelBot — the VAIC server-side Agora bot.
 *
 * Per-incident lifecycle:
 *  1. join(incidentId)   → bot joins Agora channel, starts audio observation
 *  2. Real-time PCM frames → AudioBuffer → 500ms chunks → Kafka audio.raw
 *  3. publishTTS(audio)  → bot injects synthesized speech back into the channel
 *  4. leave(incidentId)  → bot leaves, stops recording, flushes buffers
 *
 * Architecture note:
 * Agora's server-side SDK (agora-node-sdk) provides native PCM callbacks.
 * We use agora-node-sdk in production; in this implementation we provide
 * the interface + mock path that works without the native binary (local dev).
 *
 * The native Agora Node.js SDK requires:
 *   - Linux (production pods on EKS)
 *   - npm install agora-node-sdk
 *   - Compiled .node binary (shipped by Agora)
 *
 * For local Windows development, MOCK_AUDIO_MODE=true bypasses the SDK entirely.
 */
export class AgoraChannelBot extends EventEmitter {
  private activeChannels = new Map<string, {
    audioBuffer: AudioBuffer;
    kafkaProducer: AudioKafkaProducer;
    cloudRecorder?: AgoraCloudRecorder;
    agoraClient?: unknown; // agora-node-sdk client (null in mock mode)
  }>();

  private kafkaProducer: Producer;
  private mockMode: boolean;

  constructor(kafkaProducer: Producer, mockMode = config.mockAudioMode) {
    super();
    this.kafkaProducer = kafkaProducer;
    this.mockMode = mockMode;
  }

  /**
   * Join an Agora channel for a given incident.
   * In production: joins with the Agora Node SDK and starts PCM observation.
   * In mock mode: returns immediately (MockAudioSource handles the rest).
   */
  async join(incidentId: string): Promise<void> {
    if (this.activeChannels.has(incidentId)) {
      logger.warn({ message: 'Already joined channel', incidentId, service: 'ais' });
      return;
    }

    const audioBuffer = new AudioBuffer(incidentId);
    const audioKafkaProducer = new AudioKafkaProducer(this.kafkaProducer);

    // Wire AudioBuffer chunk events → Kafka publisher
    audioBuffer.on('chunk', async (event) => {
      try {
        await audioKafkaProducer.publishChunk(event);
      } catch (err) {
        logger.error({
          message: 'Failed to publish audio chunk',
          error: (err as Error).message,
          incidentId,
          service: 'ais',
        });
      }
    });

    const channelState: Parameters<typeof this.activeChannels.set>[1] = {
      audioBuffer,
      kafkaProducer: audioKafkaProducer,
    };

    if (!this.mockMode) {
      await this._joinLive(incidentId, audioBuffer, channelState);
    } else {
      logger.info({
        message: 'Agora bot joined (MOCK MODE — no real Agora connection)',
        incidentId,
        service: 'ais',
      });
    }

    this.activeChannels.set(incidentId, channelState);

    // Start Cloud Recording if audio persistence is enabled
    if (config.audioPersist && !this.mockMode) {
      await this._startCloudRecording(incidentId, channelState);
    }

    this.emit('joined', incidentId);
  }

  /**
   * Production: join via Agora Node SDK.
   * The SDK calls onAudioFrameHandler for each PCM frame from each participant.
   */
  private async _joinLive(
    incidentId: string,
    audioBuffer: AudioBuffer,
    channelState: Record<string, unknown>
  ): Promise<void> {
    let AgoraRtcEngine: unknown;

    try {
      // Dynamic import — only available on Linux production pods
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const agoraSdk = require('agora-node-sdk');
      AgoraRtcEngine = agoraSdk.RtcEngine;
    } catch {
      throw new Error(
        'agora-node-sdk not available. Set MOCK_AUDIO_MODE=true for local development, ' +
        'or ensure the native binary is installed on Linux (production only).'
      );
    }

    const token = generateBotToken(incidentId);
    const rtcEngine = new (AgoraRtcEngine as any)();

    rtcEngine.initialize(config.appId);
    rtcEngine.setChannelProfile(1); // Live Broadcasting
    rtcEngine.setClientRole(1);     // Broadcaster (can publish + subscribe)

    // Enable raw audio frame callbacks at 16kHz mono 16-bit
    rtcEngine.setRecordingAudioFrameParameters(
      config.sampleRate,
      config.channels,
      0,  // RAW_AUDIO_FRAME_OP_MODE_READ_ONLY
      Math.floor(config.sampleRate * config.chunkDurationMs / 1000 / 100) // samples per call
    );

    rtcEngine.on('joinedChannel', (channel: string, uid: number) => {
      logger.info({ message: 'Bot joined Agora channel', incidentId: channel, uid, service: 'ais' });
    });

    rtcEngine.on('userJoined', (uid: number) => {
      logger.info({ message: 'Participant joined', uid, incidentId, service: 'ais' });
      this.emit('participantJoined', { incidentId, uid });
    });

    rtcEngine.on('userOffline', (uid: number) => {
      logger.info({ message: 'Participant left', uid, incidentId, service: 'ais' });
      audioBuffer.flush();
      this.emit('participantLeft', { incidentId, uid });
    });

    // ─── The critical callback: raw PCM per participant ───────
    rtcEngine.on('audioFrame', (uid: number, frame: { buffer: Buffer; samples: number; samplesPerSec: number }) => {
      const frameDurationMs = (frame.samples / frame.samplesPerSec) * 1000;
      audioBuffer.addFrame(uid, frame.buffer, frameDurationMs);
    });

    rtcEngine.joinChannel(token, incidentId, '', config.botUid);
    (channelState as any).agoraClient = rtcEngine;
  }

  private async _startCloudRecording(
    incidentId: string,
    channelState: Record<string, unknown>
  ): Promise<void> {
    try {
      const recorder = new AgoraCloudRecorder();
      const token = generateBotToken(incidentId);
      await recorder.acquire(incidentId);
      await recorder.start(incidentId, token);
      (channelState as any).cloudRecorder = recorder;
    } catch (err) {
      logger.error({
        message: 'Failed to start Cloud Recording (non-fatal)',
        error: (err as Error).message,
        incidentId,
        service: 'ais',
      });
    }
  }

  /**
   * Inject TTS audio back into the Agora channel.
   * The VSE calls this after synthesizing VAIC's spoken output.
   *
   * @param incidentId - Target channel
   * @param pcmBuffer  - Synthesized speech as 16kHz mono 16-bit PCM
   */
  async publishTTS(incidentId: string, pcmBuffer: Buffer): Promise<void> {
    if (this.mockMode) {
      logger.info({
        message: 'TTS audio (MOCK — not injected)',
        incidentId,
        bytes: pcmBuffer.length,
        service: 'ais',
      });
      return;
    }

    const channelState = this.activeChannels.get(incidentId);
    if (!channelState?.agoraClient) {
      logger.warn({ message: 'Cannot publish TTS — bot not joined', incidentId, service: 'ais' });
      return;
    }

    const rtcEngine = channelState.agoraClient as any;
    rtcEngine.pushAudioFrame({
      buffer: pcmBuffer,
      samples: Math.floor(config.sampleRate * 0.02), // 20ms frame size
      samplesPerSec: config.sampleRate,
      channels: config.channels,
    });
  }

  /**
   * Leave an Agora channel and clean up all resources.
   */
  async leave(incidentId: string): Promise<void> {
    const channelState = this.activeChannels.get(incidentId);
    if (!channelState) return;

    const { audioBuffer, cloudRecorder, agoraClient } = channelState as any;

    // Flush remaining audio
    audioBuffer.flush();

    // Stop Cloud Recording
    if (cloudRecorder) {
      try {
        await cloudRecorder.stop(incidentId);
      } catch (err) {
        logger.error({ message: 'Cloud recording stop failed', error: (err as Error).message, service: 'ais' });
      }
    }

    // Leave Agora channel
    if (agoraClient && !this.mockMode) {
      agoraClient.leaveChannel();
      agoraClient.release();
    }

    this.activeChannels.delete(incidentId);
    this.emit('left', incidentId);

    logger.info({ message: 'Bot left Agora channel', incidentId, service: 'ais' });
  }

  isActive(incidentId: string): boolean {
    return this.activeChannels.has(incidentId);
  }

  activeIncidents(): string[] {
    return Array.from(this.activeChannels.keys());
  }
}
