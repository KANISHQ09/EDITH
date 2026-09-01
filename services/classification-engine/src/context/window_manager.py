"""
Context Window Manager
Maintains a rolling window of the last N transcript entries per incident in Redis.
Used to give Claude conversation context for accurate classification (NCE-09).
"""

import json

import structlog
from redis.asyncio import Redis

from ..config import settings
from ..models import ContextWindowEntry

logger = structlog.get_logger(__name__)

CONTEXT_KEY_PREFIX = "vaic:context:"
MAX_WINDOW_SIZE = settings.llm_context_window_size


class ContextWindowManager:
    """
    Manages the LLM context window (last N utterances) per incident in Redis.
    Uses a Redis list with LPUSH + LTRIM to maintain a bounded rolling window.
    """

    def __init__(self, redis: Redis):
        self.redis = redis

    def _key(self, incident_id: str) -> str:
        return f"{CONTEXT_KEY_PREFIX}{incident_id}"

    async def add_entry(
        self,
        incident_id: str,
        entry: ContextWindowEntry,
    ) -> None:
        """
        Add a new utterance to the context window.
        Uses LPUSH + LTRIM to keep only the last MAX_WINDOW_SIZE entries.
        """
        key = self._key(incident_id)
        serialized = entry.model_dump_json()

        pipe = self.redis.pipeline()
        pipe.lpush(key, serialized)
        pipe.ltrim(key, 0, MAX_WINDOW_SIZE - 1)
        await pipe.execute()

        logger.debug(
            "Context window updated",
            incident_id=incident_id,
            speaker=entry.speaker_name,
        )

    async def get_context(self, incident_id: str) -> list[ContextWindowEntry]:
        """
        Retrieve the current context window (ordered oldest → newest).
        Returns an empty list if no context exists yet.
        """
        key = self._key(incident_id)
        raw_entries = await self.redis.lrange(key, 0, -1)

        if not raw_entries:
            return []

        # Redis list is newest-first (LPUSH), so reverse for chronological order
        entries: list[ContextWindowEntry] = []
        for raw in reversed(raw_entries):
            try:
                data = json.loads(raw)
                entries.append(ContextWindowEntry(**data))
            except Exception as e:
                logger.warning("Failed to deserialize context entry", error=str(e))

        return entries

    async def clear_context(self, incident_id: str) -> None:
        """
        Clear the context window when an incident is resolved.
        """
        await self.redis.delete(self._key(incident_id))
        logger.info("Context window cleared", incident_id=incident_id)
