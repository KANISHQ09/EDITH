import { EventEmitter } from 'events';
import { logger } from '../lib/logger';
import { config } from '../config';

/**
 * AudioBuffer — collects raw PCM audio frames and emits 500ms chunks.
 *
 * Agora delivers audio in small frames (10ms or 20ms by default).
 * We accumulate these into 500ms segments before publishing to Kafka,
 * which matches Whisper's optimal input window.
 *
 * Emits: 'chunk' — { participantUid, incidentId, buffer, timestamp }
 */
export class AudioBuffer extends EventEmitter {
  private buffers = new Map<number, Buffer[]>(); // uid → frame list
  private totalMs = new Map<number, number>();    // uid → accumulated ms
  private incidentId: string;

  // At 16kHz mono 16-bit PCM: 500ms = 16000 * 0.5 * 2 = 16000 bytes
  private readonly targetBytes: number;

  constructor(incidentId: string) {
    super();
    this.incidentId = incidentId;
    // 500ms worth of 16kHz mono 16-bit PCM
    this.targetBytes = Math.floor(config.sampleRate * (config.chunkDurationMs / 1000) * 2);
  }

  /**
   * Called by the Agora audio observer when a PCM frame arrives.
   * @param uid - Participant UID
   * @param frame - Raw PCM Buffer (16kHz, 16-bit, mono)
   * @param frameDurationMs - Duration of this frame in milliseconds
   */
  addFrame(uid: number, frame: Buffer, frameDurationMs = 20): void {
    if (!this.buffers.has(uid)) {
      this.buffers.set(uid, []);
      this.totalMs.set(uid, 0);
    }

    const frames = this.buffers.get(uid)!;
    frames.push(frame);
    this.totalMs.set(uid, (this.totalMs.get(uid) || 0) + frameDurationMs);

    // Check if accumulated enough for 500ms chunk
    const accumulated = frames.reduce((sum, f) => sum + f.length, 0);
    if (accumulated >= this.targetBytes) {
      this._emitChunk(uid);
    }
  }

  private _emitChunk(uid: number): void {
    const frames = this.buffers.get(uid) || [];
    if (frames.length === 0) return;

    const chunk = Buffer.concat(frames);
    const trimmed = chunk.slice(0, this.targetBytes);

    this.emit('chunk', {
      participantUid: uid,
      incidentId: this.incidentId,
      buffer: trimmed,
      timestamp: new Date().toISOString(),
      durationMs: config.chunkDurationMs,
    });

    // Keep any overflow in the buffer
    const overflow = chunk.slice(this.targetBytes);
    this.buffers.set(uid, overflow.length > 0 ? [overflow] : []);
    this.totalMs.set(uid, 0);
  }

  /**
   * Flush any remaining audio for all participants.
   * Called when recording stops.
   */
  flush(): void {
    for (const [uid, frames] of this.buffers.entries()) {
      if (frames.length > 0) {
        const chunk = Buffer.concat(frames);
        if (chunk.length > 0) {
          this.emit('chunk', {
            participantUid: uid,
            incidentId: this.incidentId,
            buffer: chunk,
            timestamp: new Date().toISOString(),
            durationMs: (chunk.length / (config.sampleRate * 2)) * 1000,
          });
        }
      }
    }
    this.buffers.clear();
    this.totalMs.clear();
  }

  getActiveParticipants(): number[] {
    return Array.from(this.buffers.keys());
  }
}
