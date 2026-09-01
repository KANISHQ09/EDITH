"""
Classification Engine — Kafka Consumer + Producer
Consumes from transcript.entries.{incident_id} and publishes to classifications.{incident_id}
"""

import json
import uuid
from datetime import datetime, timezone

import structlog
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from redis.asyncio import Redis

from ..classifiers.claude_classifier import Classifier
from ..config import settings
from ..context.window_manager import ContextWindowManager
from ..models import (
    ClassificationRecord,
    ContextWindowEntry,
    TranscriptEntryMessage,
)

logger = structlog.get_logger(__name__)

TRANSCRIPT_TOPIC_PREFIX = "transcript.entries"
CLASSIFICATION_TOPIC_PREFIX = "classifications"


class ClassificationConsumer:
    """
    Consumes transcript entries from Kafka, classifies them via Claude,
    updates the context window, and publishes classification records back to Kafka.
    """

    def __init__(self, redis: Redis):
        self.redis = redis
        self.classifier = Classifier()
        self.context_manager = ContextWindowManager(redis)
        self.consumer: AIOKafkaConsumer | None = None
        self.producer: AIOKafkaProducer | None = None
        self._running = False

    async def start(self) -> None:
        """Start the Kafka consumer and producer."""
        self.producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_brokers,
            client_id=f"{settings.kafka_client_id}-producer",
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
        )
        await self.producer.start()

        # Subscribe to all transcript.entries.* topics
        self.consumer = AIOKafkaConsumer(
            bootstrap_servers=settings.kafka_brokers,
            group_id=settings.kafka_group_id,
            client_id=settings.kafka_client_id,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        )

        # Subscribe with pattern matching for all incident topics
        await self.consumer.start()
        self.consumer.subscribe(pattern=f"^{TRANSCRIPT_TOPIC_PREFIX}.*")

        self._running = True
        logger.info(
            "Classification Engine started",
            kafka_brokers=settings.kafka_brokers,
            group_id=settings.kafka_group_id,
        )

    async def stop(self) -> None:
        """Gracefully stop consumer and producer."""
        self._running = False
        if self.consumer:
            await self.consumer.stop()
        if self.producer:
            await self.producer.stop()
        logger.info("Classification Engine stopped")

    async def run(self) -> None:
        """Main consumption loop."""
        await self.start()

        try:
            async for message in self.consumer:
                if not self._running:
                    break

                try:
                    await self._process_message(message)
                except Exception as e:
                    logger.error(
                        "Failed to process transcript entry",
                        error=str(e),
                        topic=message.topic,
                        offset=message.offset,
                    )
                    # Do not crash — continue processing next messages
        finally:
            await self.stop()

    async def _process_message(self, message) -> None:
        """
        Process a single transcript entry:
        1. Deserialize and validate
        2. Retrieve context window
        3. Classify via Claude
        4. Update context window with result
        5. Publish classification record to Kafka
        6. Detect unassigned action items and unresolved questions
        """
        raw = message.value
        entry = TranscriptEntryMessage(**raw)
        incident_id = entry.incident_id

        logger.debug(
            "Processing transcript entry",
            incident_id=incident_id,
            speaker=entry.speaker_name,
            content_preview=entry.content[:80],
        )

        # Get rolling context window
        context = await self.context_manager.get_context(incident_id)

        # Classify the utterance
        try:
            result = await self.classifier.classify(
                utterance_text=entry.content,
                speaker_name=entry.speaker_name or entry.speaker_label or "Unknown",
                speaker_role=entry.speaker_role or "Responder",
                context_window=context,
                incident_id=incident_id,
            )
        except ClassificationError as e:
            logger.error("Classification failed, queuing for retry", error=str(e), incident_id=incident_id)
            return

        # Build classification record
        record = ClassificationRecord(
            id=str(uuid.uuid4()),
            transcript_entry_id=None,  # Will be set after DB insert in ISM
            incident_id=incident_id,
            type=result.type,
            confidence=result.confidence,
            summary=result.summary,
            entities=result.entities,
            action_item_owner=result.action_item_owner,
            requires_followup=result.requires_followup,
            speaker_name=entry.speaker_name,
            speaker_role=entry.speaker_role,
            original_text=entry.content,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        # Update context window with this utterance + its classification
        context_entry = ContextWindowEntry(
            speaker_name=entry.speaker_name,
            role=entry.speaker_role,
            text=entry.content,
            ts=entry.start_ts,
            classification_type=result.type.value,
        )
        await self.context_manager.add_entry(incident_id, context_entry)

        # Publish to classifications.{incident_id}
        classification_topic = f"{CLASSIFICATION_TOPIC_PREFIX}.{incident_id}"
        await self.producer.send_and_wait(
            classification_topic,
            key=incident_id,
            value=record.model_dump(),
        )

        logger.info(
            "Classification published",
            incident_id=incident_id,
            type=result.type.value,
            confidence=result.confidence,
            speaker=entry.speaker_name,
            topic=classification_topic,
        )

        # Flag unassigned action items (NCE-06)
        if result.type.value == "ACTION_ITEM" and not result.action_item_owner:
            logger.warning(
                "Unassigned action item detected",
                incident_id=incident_id,
                summary=result.summary,
            )
            # Publish a flagged version to the audit topic so the dashboard can surface this
            await self.producer.send_and_wait(
                "audit.events",
                key=incident_id,
                value={
                    "incident_id": incident_id,
                    "service": "classification-engine",
                    "actor_id": "VAIC_SYSTEM",
                    "action": "UNASSIGNED_ACTION_ITEM_DETECTED",
                    "details": {"summary": result.summary, "classification_id": record.id},
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )
