"""
WhisperASR — Faster-Whisper inference wrapper.

Uses CTranslate2 backend (faster-whisper) for:
  - CPU dev mode: int8 quantization, ~3× faster than original Whisper
  - GPU prod mode: float16, real-time capable at large-v3 quality

Voice Activity Detection (VAD) is enabled by default — Whisper's built-in
silero-VAD skips silent segments, reducing unnecessary LLM calls downstream.
"""

import numpy as np
import structlog
from faster_whisper import WhisperModel
from faster_whisper.vad import VadOptions

from ..config import settings

logger = structlog.get_logger(__name__)


class WhisperASR:
    """
    Singleton Whisper model wrapper.
    Model is loaded once at startup and reused for all transcription calls.
    """

    _instance: "WhisperASR | None" = None

    def __init__(self):
        logger.info(
            "Loading Whisper model",
            model=settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
        self.model = WhisperModel(
            model_size_or_path=settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
            num_workers=2,
            cpu_threads=4,
        )
        self.language = settings.whisper_language or None
        self.beam_size = settings.whisper_beam_size
        logger.info("Whisper model loaded", model=settings.whisper_model)

    @classmethod
    def get_instance(cls) -> "WhisperASR":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def transcribe(
        self,
        audio_pcm: np.ndarray,
        speaker_label: str = "Unknown",
    ) -> list[dict]:
        """
        Transcribe a numpy array of 16kHz mono float32 audio.

        Returns a list of segments:
        [
          {
            "text": str,
            "start": float,  # seconds from start of buffer
            "end": float,
            "confidence": float,  # average token confidence
            "no_speech_prob": float,
          },
          ...
        ]
        """
        vad_opts = (
            VadOptions(
                threshold=0.5,
                min_silence_duration_ms=300,
                speech_pad_ms=100,
            )
            if settings.whisper_vad_filter
            else None
        )

        segments, info = self.model.transcribe(
            audio_pcm,
            language=self.language,
            beam_size=self.beam_size,
            vad_filter=settings.whisper_vad_filter,
            vad_parameters=vad_opts,
            word_timestamps=False,
            condition_on_previous_text=True,
        )

        results = []
        for seg in segments:
            # Calculate average token log-prob as confidence proxy
            avg_log_prob = seg.avg_logprob if hasattr(seg, "avg_logprob") else -0.5
            confidence = float(np.exp(avg_log_prob))  # Convert log-prob to 0–1

            results.append(
                {
                    "text": seg.text.strip(),
                    "start": seg.start,
                    "end": seg.end,
                    "confidence": round(min(confidence, 1.0), 3),
                    "no_speech_prob": round(seg.no_speech_prob, 3),
                }
            )

        logger.debug(
            "Whisper transcription complete",
            speaker=speaker_label,
            segments=len(results),
            language=info.language,
            duration=round(len(audio_pcm) / settings.sample_rate, 2),
        )

        # Filter out segments with high no_speech_prob (silence / noise)
        return [s for s in results if s["no_speech_prob"] < 0.8 and s["text"]]


def pcm_bytes_to_float32(pcm_bytes: bytes) -> np.ndarray:
    """
    Convert 16kHz mono 16-bit PCM bytes → float32 numpy array.
    Whisper expects float32 normalized to [-1, 1].
    """
    audio_int16 = np.frombuffer(pcm_bytes, dtype=np.int16)
    return audio_int16.astype(np.float32) / 32768.0
