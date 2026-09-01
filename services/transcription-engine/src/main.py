"""
Transcription Engine — FastAPI application entry point.
"""

import asyncio
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from redis.asyncio import Redis

from .config import settings
from .kafka.consumer import TranscriptionConsumer

logger = structlog.get_logger(__name__)

# ─── App State ────────────────────────────────────────────────
redis: Redis | None = None
consumer: TranscriptionConsumer | None = None
consumer_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis, consumer, consumer_task

    # Pre-load models at startup (slow, only happens once)
    logger.info("Pre-loading Whisper and pyannote models...")
    from .asr.whisper_asr import WhisperASR
    from .diarization.speaker_diarizer import SpeakerDiarizer

    WhisperASR.get_instance()
    SpeakerDiarizer.get_instance()

    redis = Redis.from_url(settings.redis_url, decode_responses=False)
    consumer = TranscriptionConsumer(redis)
    consumer_task = asyncio.create_task(consumer.run())

    logger.info(
        "Transcription Engine ready",
        whisper_model=settings.whisper_model,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
    )

    yield

    # Shutdown
    logger.info("Shutting down Transcription Engine...")
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass

    if consumer:
        await consumer.stop()

    if redis:
        await redis.aclose()


app = FastAPI(
    title="VAIC Transcription Engine",
    description="Whisper ASR + pyannote diarization pipeline for VAIC",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "vaic-transcription-engine",
        "whisper_model": settings.whisper_model,
        "device": settings.whisper_device,
    }


@app.get("/ready")
async def ready():
    from .asr.whisper_asr import WhisperASR
    from .diarization.speaker_diarizer import SpeakerDiarizer
    models_loaded = (
        WhisperASR._instance is not None
        and SpeakerDiarizer._instance is not None
    )
    return {
        "ready": models_loaded,
        "whisper_loaded": WhisperASR._instance is not None,
        "diarizer_loaded": SpeakerDiarizer._instance is not None,
    }
