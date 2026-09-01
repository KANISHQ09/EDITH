"""
Classification Engine — FastAPI Application Entry Point
"""

import asyncio
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from redis.asyncio import Redis

from .config import settings
from .kafka.consumer import ClassificationConsumer

# ─── Structured Logging Setup ────────────────────────────────
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Global consumer reference
consumer: ClassificationConsumer | None = None
consumer_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    global consumer, consumer_task

    logger.info(
        "Starting Classification Engine",
        service=settings.service_name,
        environment=settings.environment,
        mock_mode=settings.mock_llm_mode,
    )

    # Connect Redis
    redis = Redis.from_url(settings.redis_url, decode_responses=True)

    # Start Kafka consumer in background
    consumer = ClassificationConsumer(redis=redis)
    consumer_task = asyncio.create_task(consumer.run())

    logger.info("Classification Engine ready")
    yield

    # Shutdown
    logger.info("Shutting down Classification Engine")
    if consumer:
        await consumer.stop()
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
    await redis.aclose()


app = FastAPI(
    title="VAIC Classification Engine",
    description="NLP classification of incident transcript utterances using Claude claude-sonnet-4-6",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.service_name}


@app.get("/health/ready")
async def ready():
    return {"status": "ready", "service": settings.service_name}


@app.get("/health/metrics")
async def metrics():
    return {
        "service": settings.service_name,
        "mock_mode": settings.mock_llm_mode,
        "model": settings.anthropic_model,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
