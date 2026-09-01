"""
Speaker Diarization — pyannote.audio 3.3.1

Segments audio by speaker identity and maps Agora UIDs to speaker labels.
Uses a Redis-backed speaker map that persists across the incident lifetime.

Pipeline:
  1. Receive accumulated audio buffer (5 seconds)
  2. Run pyannote speaker-diarization-3.1
  3. Get speaker segments: {SPEAKER_00: [(0.5, 2.1), ...], ...}
  4. Map pyannote speaker labels to Agora UIDs (via prior knowledge of who joined)
  5. Align with Whisper text segments
"""

import numpy as np
import structlog
import torch
from redis.asyncio import Redis

from ..config import settings

logger = structlog.get_logger(__name__)


class SpeakerDiarizer:
    """
    Wraps pyannote.audio speaker diarization pipeline.
    Singleton — model loaded once at startup.
    """

    _instance: "SpeakerDiarizer | None" = None

    def __init__(self):
        if not settings.hf_token:
            logger.warning(
                "HF_TOKEN not set — pyannote model may fail to download. Set hf_token in config or HF_TOKEN env var."
            )

        logger.info("Loading pyannote diarization pipeline", model=settings.pyannote_model)
        from pyannote.audio import Pipeline

        self.pipeline = Pipeline.from_pretrained(
            settings.pyannote_model,
            use_auth_token=settings.hf_token or None,
        )

        # Send to GPU if available
        if settings.whisper_device == "cuda" and torch.cuda.is_available():
            self.pipeline = self.pipeline.to(torch.device("cuda"))

        logger.info("Pyannote pipeline loaded")

    @classmethod
    def get_instance(cls) -> "SpeakerDiarizer":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def diarize(
        self,
        audio_float32: np.ndarray,
        num_speakers: int | None = None,
    ) -> list[dict]:
        """
        Run speaker diarization on a float32 audio array.

        Returns:
        [
          {"speaker": "SPEAKER_00", "start": 0.5, "end": 2.1},
          {"speaker": "SPEAKER_01", "start": 2.3, "end": 4.7},
          ...
        ]
        """
        # pyannote requires (channel, time) tensor or a file-like
        audio_tensor = torch.tensor(audio_float32).unsqueeze(0)  # (1, samples)

        diarize_kwargs = {}
        if num_speakers:
            diarize_kwargs["num_speakers"] = num_speakers
        else:
            diarize_kwargs["min_speakers"] = settings.diarization_min_speakers
            diarize_kwargs["max_speakers"] = settings.diarization_max_speakers

        diarization = self.pipeline(
            {"waveform": audio_tensor, "sample_rate": settings.sample_rate},
            **diarize_kwargs,
        )

        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append(
                {
                    "speaker": speaker,
                    "start": round(turn.start, 3),
                    "end": round(turn.end, 3),
                }
            )

        return segments


class SpeakerMapper:
    """
    Maps pyannote speaker labels (SPEAKER_00, SPEAKER_01, ...)
    to Agora UIDs and human-readable speaker names.

    Stored in Redis so the mapping persists across the incident.
    """

    def __init__(self, redis: Redis, incident_id: str):
        self.redis = redis
        self.key = f"vaic:speakers:{incident_id}"
        self.ttl = settings.speaker_map_ttl_s

    async def get_or_create_mapping(self, pyannote_label: str, agora_uid: int | None = None) -> str:
        """
        Returns the stable speaker label for a pyannote speaker.
        If the pyannote label is new, registers it (optionally linking to an Agora UID).
        """
        raw = await self.redis.hget(self.key, pyannote_label)
        if raw:
            return raw.decode() if isinstance(raw, bytes) else raw

        # Create a new mapping
        speaker_name = f"Speaker_{pyannote_label.replace('SPEAKER_', '')}"
        if agora_uid is not None:
            speaker_name = f"Speaker_{agora_uid}"

        await self.redis.hset(self.key, pyannote_label, speaker_name)
        await self.redis.expire(self.key, self.ttl)

        logger.info(
            "New speaker mapped",
            pyannote_label=pyannote_label,
            speaker_name=speaker_name,
            agora_uid=agora_uid,
        )
        return speaker_name

    async def get_all_speakers(self) -> dict:
        raw = await self.redis.hgetall(self.key)
        return {k.decode(): v.decode() for k, v in raw.items()}

    async def update_speaker_name(self, pyannote_label: str, name: str) -> None:
        """Called when a speaker self-identifies ("Hi, I'm Alex, the IC")."""
        await self.redis.hset(self.key, pyannote_label, name)
        logger.info("Speaker name updated", pyannote_label=pyannote_label, name=name)


def align_transcripts_with_speakers(
    whisper_segments: list[dict],
    diarization_segments: list[dict],
) -> list[dict]:
    """
    Align Whisper text segments with pyannote speaker diarization segments.

    For each Whisper segment, find the dominant speaker during that time window.
    Returns enriched segments with speaker labels.
    """
    aligned = []

    for ws in whisper_segments:
        ws_start = ws["start"]
        ws_end = ws["end"]

        # Calculate overlap with each diarization segment
        overlaps: dict[str, float] = {}
        for ds in diarization_segments:
            overlap_start = max(ws_start, ds["start"])
            overlap_end = min(ws_end, ds["end"])
            overlap_duration = max(0.0, overlap_end - overlap_start)
            if overlap_duration > 0:
                overlaps[ds["speaker"]] = overlaps.get(ds["speaker"], 0) + overlap_duration

        # Assign to the speaker with the most overlap
        dominant_speaker = max(overlaps, key=overlaps.get) if overlaps else "SPEAKER_00"

        aligned.append(
            {
                **ws,
                "speaker": dominant_speaker,
            }
        )

    return aligned
