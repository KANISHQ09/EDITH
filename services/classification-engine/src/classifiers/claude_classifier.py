"""
NLP Classification Engine — LLM Classifier
Classifies transcript utterances using Google Gemini (primary) or Anthropic Claude (alternative).
"""

import asyncio
import json
from typing import Any

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import settings
from ..models import (
    ClaudeClassificationResponse,
    ContextWindowEntry,
    ExtractedEntities,
)
from ..prompts.classification import (
    CLASSIFICATION_SYSTEM_PROMPT,
    MOCK_CLASSIFICATION_RESPONSE,
    build_classification_prompt,
)

logger = structlog.get_logger(__name__)


class ClassificationError(Exception):
    """Raised when classification fails after all retries"""


class Classifier:
    """
    Utterance classifier supporting both Google Gemini and Anthropic Claude.
    Defaults to Gemini Flash for ultra-fast, structured JSON inference.
    """

    def __init__(self) -> None:
        self.mock_mode: bool = settings.mock_llm_mode
        self.provider: str = settings.llm_provider
        self.timeout_s: float = settings.classification_timeout_ms / 1000.0

        # Setup Gemini
        self.gemini_key: str | None = settings.gemini_api_key
        self.gemini_model: str = settings.gemini_model

        # Setup Anthropic if configured
        self.anthropic_client: Any = None
        if settings.anthropic_api_key:
            try:
                import anthropic  # type: ignore
                self.anthropic_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            except Exception:
                pass
        self.anthropic_model: str = settings.anthropic_model

        # HTTP client for Gemini API
        self.http_client: httpx.AsyncClient = httpx.AsyncClient(timeout=self.timeout_s)

    async def _classify_gemini(self, user_message: str) -> str:
        """Call Gemini REST API with forced JSON schema output."""
        if not self.gemini_key:
            raise ClassificationError("GEMINI_API_KEY is not configured in .env")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_key}"
        payload = {
            "system_instruction": {
                "parts": [{"text": CLASSIFICATION_SYSTEM_PROMPT}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_message}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
                "maxOutputTokens": 2048,
            }
        }

        resp = await self.http_client.post(url, json=payload)
        if resp.status_code != 200:
            raise ClassificationError(f"Gemini API error ({resp.status_code}): {resp.text}")

        data = resp.json()
        try:
            return str(data["candidates"][0]["content"]["parts"][0]["text"])
        except (KeyError, IndexError) as exc:
            raise ClassificationError(f"Unexpected Gemini response structure: {data}") from exc

    async def _classify_anthropic(self, user_message: str) -> str:
        """Call Anthropic Claude API."""
        if not self.anthropic_client:
            raise ClassificationError("Anthropic client is not configured")

        response = await self.anthropic_client.messages.create(
            model=self.anthropic_model,
            max_tokens=512,
            system=CLASSIFICATION_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        first_block = response.content[0]
        return getattr(first_block, "text", str(first_block))

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=5),
        reraise=True,
    )
    async def classify(
        self,
        utterance_text: str,
        speaker_name: str,
        speaker_role: str,
        context_window: list[ContextWindowEntry],
        incident_id: str,
    ) -> ClaudeClassificationResponse:
        """
        Classify a single utterance using the configured LLM (Gemini or Claude).
        Returns a validated ClaudeClassificationResponse.
        """
        if self.mock_mode:
            logger.debug("Using mock classification response", incident_id=incident_id)
            await asyncio.sleep(0.05)
            return ClaudeClassificationResponse(**MOCK_CLASSIFICATION_RESPONSE)

        user_message = build_classification_prompt(
            utterance_text=utterance_text,
            speaker_name=speaker_name,
            speaker_role=speaker_role,
            context_window=context_window,
        )

        logger.debug(
            "Calling LLM for classification",
            provider=self.provider,
            incident_id=incident_id,
            utterance_preview=utterance_text[:80],
        )

        try:
            if self.provider == "gemini" or self.gemini_key:
                raw_text = await asyncio.wait_for(
                    self._classify_gemini(user_message),
                    timeout=self.timeout_s,
                )
            else:
                raw_text = await asyncio.wait_for(
                    self._classify_anthropic(user_message),
                    timeout=self.timeout_s,
                )
        except asyncio.TimeoutError as exc:
            raise ClassificationError(
                f"LLM API timed out after {self.timeout_s}s for incident {incident_id}"
            ) from exc

        # Parse and validate JSON response
        try:
            parsed = json.loads(raw_text)
            classification = ClaudeClassificationResponse(**parsed)
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(
                "Failed to parse classification response",
                raw_response=raw_text,
                error=str(e),
                incident_id=incident_id,
            )
            # Graceful fallback: classify as STATUS_UPDATE with low confidence
            classification = ClaudeClassificationResponse(
                type="STATUS_UPDATE",
                confidence=0.3,
                summary=utterance_text[:120],
                entities=ExtractedEntities(),
                requires_followup=False,
            )

        logger.info(
            "Utterance classified",
            type=classification.type,
            confidence=classification.confidence,
            incident_id=incident_id,
            speaker=speaker_name,
        )

        return classification
