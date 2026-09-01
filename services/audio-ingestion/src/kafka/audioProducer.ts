import { Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger';
import { KAFKA_TOPICS, incidentTopic } from '@vaic/shared';

interface AudioChunkEvent {
  participantUid: number;
  incidentId: string;
  buffer: Buffer;
  timestamp: string;
  durationMs: number;
}

// Per-incident sequence counters for ordering
const sequenceCounters = new Map<string, number>();

/**
 * Kafka producer for audio.raw.{incident_id} topic.
 * Each 500ms PCM chunk from AudioBuffer gets serialized and published here.
 *
 * Message schema: AudioRawMessage (from @vaic/shared)
 * Key: incidentId (ensures ordering per incident)
 */
export class AudioKafkaProducer {
  private producer: Producer;
  // participantUid → stable VAIC participant UUID mapping
  private uidToParticipantId = new Map<number, string>();

  constructor(producer: Producer) {
    this.producer = producer;
  }

  /**
   * Publish a 500ms audio chunk to Kafka.
   * The PCM buffer is Base64-encoded for transport.
   */
  async publishChunk(event: AudioChunkEvent): Promise<void> {
    const { participantUid, incidentId, buffer, timestamp, durationMs } = event;

    // Map Agora UID → stable UUID for this participant
    if (!this.uidToParticipantId.has(participantUid)) {
      this.uidToParticipantId.set(participantUid, uuidv4());
    }
    const participantId = this.uidToParticipantId.get(participantUid)!;

    // Per-incident sequence number for ordering
    const seq = (sequenceCounters.get(incidentId) || 0) + 1;
    sequenceCounters.set(incidentId, seq);

    const topic = `${KAFKA_TOPICS.AUDIO_RAW}.${incidentId}`;

    const message = {
      incidentId,
      participantId,
      speakerLabel: `Speaker_${participantUid}`, // Will be refined by diarization
      audioChunk: buffer.toString('base64'),       // Base64-encoded 16kHz mono PCM
      sequenceNumber: seq,
      timestamp,
      durationMs,
    };

    await this.producer.send({
      topic,
      messages: [{
        key: incidentId,
        value: JSON.stringify(message),
        headers: {
          'content-type': 'audio/pcm',
          'sample-rate': String(16000),
          'channels': '1',
          'bit-depth': '16',
        },
      }],
    });

    logger.debug({
      message: 'Audio chunk published',
      incidentId,
      participantUid,
      sequenceNumber: seq,
      chunkBytes: buffer.length,
      durationMs,
      service: 'ais',
    });
  }

  /**
   * Participant state updates — for the state.deltas Kafka topic.
   */
  async publishParticipantJoined(
    incidentId: string,
    participantUid: number,
    producer: Producer
  ): Promise<void> {
    if (!this.uidToParticipantId.has(participantUid)) {
      this.uidToParticipantId.set(participantUid, uuidv4());
    }
    const participantId = this.uidToParticipantId.get(participantUid)!;

    await producer.send({
      topic: KAFKA_TOPICS.STATE_DELTAS,
      messages: [{
        key: incidentId,
        value: JSON.stringify({
          incidentId,
          deltaType: 'PARTICIPANT_JOINED',
          payload: {
            participantId,
            agoraUid: participantUid,
            speakerLabel: `Speaker_${participantUid}`,
            joinedAt: new Date().toISOString(),
          },
          version: 0,
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }

  async publishParticipantLeft(
    incidentId: string,
    participantUid: number,
    producer: Producer
  ): Promise<void> {
    const participantId = this.uidToParticipantId.get(participantUid);
    if (!participantId) return;

    await producer.send({
      topic: KAFKA_TOPICS.STATE_DELTAS,
      messages: [{
        key: incidentId,
        value: JSON.stringify({
          incidentId,
          deltaType: 'PARTICIPANT_LEFT',
          payload: {
            participantId,
            agoraUid: participantUid,
            leftAt: new Date().toISOString(),
          },
          version: 0,
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }
}
