"""
Transcription Engine — Kafka Consumer + Producer

Consumes: audio.raw.{incident_id}
Produces: transcript.entries.{incident_id}

Processing pipeline:
  1. Consume audio.raw chunks (500ms PCM, Base64-encoded)
  2. Accumulate N chunks (default: 10 = 5 seconds) per participant
  3. Decode Base64 → 16kHz mono int16 PCM → float32
  4. Run Whisper ASR → text segments with timestamps
  5. Run pyannote diarization → speaker segments
  6. Align text + speaker → attributed utterances
  7. Detect role self-identification ("I'm Alex, the Incident Commander")
  8. Publish TranscriptEntry to transcript.entries.{incident_id}
"""

import asyncio
import base64
import json
import re
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

import numpy as np
import structlog
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from redis.asyncio import Redis

from ..config import settings
from ..asr.whisper_asr import WhisperASR, pcm_bytes_to_float32
from ..diarization.speaker_diarizer import SpeakerDiarizer, SpeakerMapper, align_transcripts_with_speakers

logger = structlog.get_logger(__name__)

# Regex to detect speaker role self-ID in transcript text
# e.g. "I'm Alex and I'm the incident commander for this call"
ROLE_PATTERNS = {
    "INCIDENT_COMMANDER": re.compile(
        r"\b(incident commander|IC|commanding today|I'm the IC)\b", re.IGNORECASE
    ),
    "RESPONDER": re.compile(
        r"\b(on-call|oncall|responding|I'm from the .+ team)\b", re.IGNORECASE
    ),
    "OBSERVER": re.compile(
        r"\b(just observing|silently|on for context|joining as observer)\b", re.IGNORECASE
    ),
}

NAME_PATTERN = re.compile(
    r"(?:I'm|I am|this is|my name is)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?)", re.IGNORECASE
)


class AudioAccumulator:
    """
    Accumulates 500ms audio chunks per participant.
    Triggers transcription when enough chunks are collected (default: 5 seconds).
    """

    def __init__(self, target_chunks: int = 10):
        self.target_chunks = target_chunks
        # incident_id → participant_id → list of PCM float32 arrays
        self._buffers: dict[str, dict[str, list[np.ndarray]]] = defaultdict(lambda: defaultdict(list))

    def add_chunk(self, incident_id: str, participant_id: str, pcm_float32: np.ndarray) -> Optional[np.ndarray]:
        """
        Add a 500ms chunk. Returns the accumulated buffer when ready, else None.
        """
        self._buffers[incident_id][participant_id].append(pcm_float32)

        if len(self._buffers[incident_id][participant_id]) >= self.target_chunks:
            accumulated = np.concatenate(self._buffers[incident_id][participant_id])
            self._buffers[incident_id][participant_id] = []
            return accumulated

        return None


class TranscriptionConsumer:

    def __init__(self, redis: Redis):
        self.redis = redis
        self.whisper = WhisperASR.get_instance()
        self.diarizer = SpeakerDiarizer.get_instance()
        self.accumulator = AudioAccumulator(target_chunks=settings.accumulate_chunks)

        self._consumer: Optional[AIOKafkaConsumer] = None
        self._producer: Optional[AIOKafkaProducer] = None

    async def start(self):
        self._consumer = AIOKafkaConsumer(
            group_id=settings.kafka_group_id,
            bootstrap_servers=settings.kafka_brokers,
            client_id=f"{settings.kafka_client_id}-consumer",
            value_deserializer=lambda b: json.loads(b.decode()),
            auto_offset_reset="latest",
        )
        # Subscribe to all audio.raw.* topics using a pattern
        self._consumer.subscribe(pattern=r"audio\.raw\..+")

        self._producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_brokers,
            client_id=f"{settings.kafka_client_id}-producer",
            value_serializer=lambda v: json.dumps(v).encode(),
        )

        await self._consumer.start()
        await self._producer.start()

        logger.info(
            "Transcription Engine consumer started",
            pattern="audio.raw.*",
            group=settings.kafka_group_id,
        )

    async def stop(self):
        if self._consumer:
            await self._consumer.stop()
        if self._producer:
            await self._producer.stop()

    async def run(self):
        await self.start()

        try:
            async for msg in self._consumer:
                try:
                    await self._handle_audio_chunk(msg.value, msg.topic)
                except Exception as exc:
                    logger.error(
                        "Failed to process audio chunk",
                        error=str(exc),
                        topic=msg.topic,
                        exc_info=True,
                    )
        finally:
            await self.stop()

    async def _handle_audio_chunk(self, payload: dict, topic: str) -> None:
        incident_id = payload.get("incidentId")
        participant_id = payload.get("participantId")
        speaker_label = payload.get("speakerLabel", "Unknown")
        audio_b64 = payload.get("audioChunk", "")
        timestamp = payload.get("timestamp", datetime.now(timezone.utc).isoformat())

        if not incident_id or not audio_b64:
            return

        # Decode Base64 PCM → float32
        pcm_bytes = base64.b64decode(audio_b64)
        pcm_float32 = pcm_bytes_to_float32(pcm_bytes)

        # Accumulate chunks — only process when we have enough
        accumulated = self.accumulator.add_chunk(incident_id, participant_id, pcm_float32)
        if accumulated is None:
            return  # Not enough audio yet

        # Run ASR + Diarization in parallel
        asr_task = asyncio.get_event_loop().run_in_executor(
            None, self.whisper.transcribe, accumulated, speaker_label
        )
        diar_task = asyncio.get_event_loop().run_in_executor(
            None, self.diarizer.diarize, accumulated
        )

        whisper_segments, diarization_segments = await asyncio.gather(asr_task, diar_task)

        if not whisper_segments:
            logger.debug("No speech detected in audio segment", incident_id=incident_id)
            return

        # Align text with speakers
        aligned = align_transcripts_with_speakers(whisper_segments, diarization_segments)

        # Map pyannote labels to stable speaker names
        speaker_mapper = SpeakerMapper(self.redis, incident_id)

        for segment in aligned:
            speaker_name = await speaker_mapper.get_or_create_mapping(
                segment["speaker"]
            )
            content = segment["text"].strip()
            if not content:
                continue

            # Detect self-identification (role + name)
            detected_role, detected_name = self._detect_self_id(content)
            if detected_name:
                await speaker_mapper.update_speaker_name(segment["speaker"], detected_name)
                speaker_name = detected_name

            # Build TranscriptEntry
            entry = {
                "id": str(uuid.uuid4()),
                "incidentId": incident_id,
                "participantId": participant_id,
                "speakerLabel": speaker_name,
                "speakerRole": detected_role,
                "content": content,
                "startTs": timestamp,
                "endTs": timestamp,
                "confidence": segment["confidence"],
                "detectedRole": detected_role,
            }

            # Publish to transcript.entries.{incident_id}
            topic_out = f"transcript.entries.{incident_id}"
            await self._producer.send(topic_out, value=entry, key=incident_id.encode())

            logger.info(
                "Transcript entry published",
                incident_id=incident_id,
                speaker=speaker_name,
                content_preview=content[:60],
                confidence=segment["confidence"],
            )

    def _detect_self_id(self, text: str) -> tuple[Optional[str], Optional[str]]:
        """
        Returns (role, name) if the speaker self-identifies.
        E.g. "I'm Alex, the incident commander" → ("INCIDENT_COMMANDER", "Alex")
        """
        detected_role = None
        detected_name = None

        for role, pattern in ROLE_PATTERNS.items():
            if pattern.search(text):
                detected_role = role
                break

        name_match = NAME_PATTERN.search(text)
        if name_match:
            detected_name = name_match.group(1)

        return detected_role, detected_name
