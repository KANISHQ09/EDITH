"""
Conflict Detector — Semantic Embedding + LLM Conflict Detection
Implements System Design §7 (Conflict Detection pipeline):
  1. Embed new FACT using Google Gemini text-embedding-004 (or OpenAI fallback)
  2. Compute cosine similarity vs all existing facts for the incident
  3. If similarity > 0.85, use Gemini 2.0 Flash (or Claude) to confirm contradiction
  4. If confirmed, publish CONFLICT record to Kafka
"""

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
import numpy as np
import structlog
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from redis.asyncio import Redis
from tenacity import retry, stop_after_attempt, wait_exponential

logger = structlog.get_logger(__name__)

SIMILARITY_THRESHOLD = 0.85
FACTS_CACHE_KEY_PREFIX = "vaic:facts:"


class ConflictDetector:
    """
    Detects contradictions between facts using semantic embeddings + LLM verification.
    """

    def __init__(
        self,
        gemini_api_key: str | None,
        openai_client: Any,
        anthropic_client: Any,
        redis: Redis,
        producer: AIOKafkaProducer,
    ) -> None:
        self.gemini_api_key = gemini_api_key
        self.openai: Any = openai_client
        self.anthropic: Any = anthropic_client
        self.redis: Redis = redis
        self.producer: AIOKafkaProducer = producer
        self.http_client: httpx.AsyncClient = httpx.AsyncClient(timeout=10.0)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=5))
    async def embed_text(self, text: str) -> list[float]:
        """Generate semantic embedding for a text via Gemini or OpenAI."""
        if self.gemini_api_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={self.gemini_api_key}"
            payload = {
                "content": {
                    "parts": [{"text": text}]
                }
            }
            resp = await self.http_client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["embedding"]["values"]
            logger.warning("Gemini embedding failed, trying fallback", status=resp.status_code)

        if self.openai is not None:
            response = await self.openai.embeddings.create(
                model="text-embedding-3-small",
                input=text,
            )
            return response.data[0].embedding

        # Fallback: simple deterministic hash vector for local dev if no key is working
        return [float((hash(text + str(i)) % 100) / 100.0) for i in range(128)]

    def cosine_similarity(self, a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two embedding vectors."""
        a_np = np.array(a, dtype=float)
        b_np = np.array(b, dtype=float)
        denom = float(np.linalg.norm(a_np) * np.linalg.norm(b_np))
        if denom == 0.0:
            return 0.0
        return float(np.dot(a_np, b_np) / denom)

    async def get_existing_fact_embeddings(self, incident_id: str) -> list[dict]:
        """Retrieve existing fact embeddings for an incident from Redis."""
        key = f"{FACTS_CACHE_KEY_PREFIX}{incident_id}"
        raw = await self.redis.get(key)
        if not raw:
            return []
        return json.loads(str(raw))

    async def add_fact_embedding(
        self, incident_id: str, fact_id: str, text: str, embedding: list[float]
    ) -> None:
        """Add a new fact embedding to the Redis cache."""
        key = f"{FACTS_CACHE_KEY_PREFIX}{incident_id}"
        existing = await self.get_existing_fact_embeddings(incident_id)
        existing.append({"fact_id": fact_id, "text": text, "embedding": embedding})
        await self.redis.set(key, json.dumps(existing), ex=86400)

    async def confirm_contradiction(
        self, fact_a: str, fact_b: str
    ) -> tuple[bool, str]:
        """Verify whether two similar facts actually contradict each other."""
        prompt = f"""You are reviewing two statements from a live incident response call.
Determine if these two statements are genuinely contradictory — i.e., they cannot both be true.

Statement A: "{fact_a}"
Statement B: "{fact_b}"

Respond with ONLY valid JSON:
{{
  "is_contradiction": true | false,
  "confidence": 0.0-1.0,
  "description": "brief explanation of the contradiction or why they are not contradictory"
}}"""

        if self.gemini_api_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.gemini_api_key}"
            payload = {
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"response_mime_type": "application/json", "temperature": 0.1}
            }
            resp = await self.http_client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                result = json.loads(raw_text)
                return bool(result.get("is_contradiction", False)), str(result.get("description", ""))

        if self.anthropic is not None:
            response = await self.anthropic.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=256,
                messages=[{"role": "user", "content": prompt}],
            )
            raw_text = response.content[0].text.strip()
            result = json.loads(raw_text)
            return bool(result.get("is_contradiction", False)), str(result.get("description", ""))

        return False, ""

    async def check_for_conflicts(
        self, incident_id: str, fact_id: str, fact_text: str
    ) -> dict | None:
        new_embedding = await self.embed_text(fact_text)
        existing_facts = await self.get_existing_fact_embeddings(incident_id)

        conflict_record = None

        for existing in existing_facts:
            if existing["fact_id"] == fact_id:
                continue

            similarity = self.cosine_similarity(new_embedding, existing["embedding"])

            if similarity >= SIMILARITY_THRESHOLD:
                is_contradiction, description = await self.confirm_contradiction(
                    fact_a=existing["text"],
                    fact_b=fact_text,
                )

                if is_contradiction:
                    conflict_record = {
                        "id": str(uuid.uuid4()),
                        "incident_id": incident_id,
                        "fact_a_id": existing["fact_id"],
                        "fact_b_id": fact_id,
                        "description": description,
                        "status": "OPEN",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "similarity_score": round(similarity, 3),
                    }
                    break

        await self.add_fact_embedding(incident_id, fact_id, fact_text, new_embedding)
        return conflict_record


async def run_conflict_detector() -> None:
    from redis.asyncio import Redis as AsyncRedis

    kafka_brokers = os.getenv("KAFKA_BROKERS", "localhost:9092")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    gemini_key = os.getenv("GEMINI_API_KEY")

    redis = AsyncRedis.from_url(redis_url, decode_responses=True)

    openai_client: Any = None
    if os.getenv("OPENAI_API_KEY"):
        try:
            import openai  # type: ignore
            openai_client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        except Exception:
            pass

    anthropic_client: Any = None
    if os.getenv("ANTHROPIC_API_KEY"):
        try:
            import anthropic  # type: ignore
            anthropic_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        except Exception:
            pass

    producer = AIOKafkaProducer(
        bootstrap_servers=kafka_brokers,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
    )
    await producer.start()

    detector = ConflictDetector(
        gemini_api_key=gemini_key,
        openai_client=openai_client,
        anthropic_client=anthropic_client,
        redis=redis,
        producer=producer,
    )

    consumer = AIOKafkaConsumer(
        bootstrap_servers=kafka_brokers,
        group_id=os.getenv("KAFKA_GROUP_ID_CDM", "vaic-cdm-group"),
        auto_offset_reset="earliest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )
    await consumer.start()
    consumer.subscribe(pattern="^classifications.*")

    logger.info("Conflict Detector started", gemini=bool(gemini_key), kafka_brokers=kafka_brokers)

    try:
        async for message in consumer:
            classification = message.value
            incident_id = classification.get("incident_id")

            if classification.get("type") != "FACT":
                continue

            fact_id = classification.get("id")
            fact_text = classification.get("summary") or classification.get("original_text", "")

            if not fact_text or not incident_id:
                continue

            conflict = await detector.check_for_conflicts(
                incident_id=incident_id,
                fact_id=fact_id,
                fact_text=fact_text,
            )

            if conflict:
                await producer.send_and_wait(
                    "state.deltas",
                    key=incident_id,
                    value={
                        "incidentId": incident_id,
                        "deltaType": "CONFLICT_DETECTED",
                        "payload": conflict,
                        "version": 0,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
    finally:
        await consumer.stop()
        await producer.stop()
        await redis.aclose()


if __name__ == "__main__":
    asyncio.run(run_conflict_detector())
