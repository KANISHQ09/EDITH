import uuid
from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class ClassificationType(str, Enum):
    FACT = "FACT"
    HYPOTHESIS = "HYPOTHESIS"
    DECISION = "DECISION"
    ACTION_ITEM = "ACTION_ITEM"
    QUESTION = "QUESTION"
    STATUS_UPDATE = "STATUS_UPDATE"
    SOCIAL = "SOCIAL"


class ExtractedEntities(BaseModel):
    systems: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    timestamps: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    error_codes: list[str] = Field(default_factory=list)
    urls: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)


class ClaudeClassificationResponse(BaseModel):
    """
    Schema that Claude must return for each utterance.
    Matches the classification prompt schema in System Design §7.1.
    """

    type: ClassificationType
    confidence: float = Field(ge=0.0, le=1.0)
    summary: str
    entities: ExtractedEntities = Field(default_factory=ExtractedEntities)
    action_item_owner: str | None = None
    requires_followup: bool = False


class TranscriptEntryMessage(BaseModel):
    """Kafka message from transcript.entries topic"""

    incident_id: str
    participant_id: str | None = None
    speaker_label: str | None = None
    speaker_name: str | None = None
    speaker_role: str | None = None
    content: str
    start_ts: str
    end_ts: str
    confidence: float = 1.0
    audio_ref: str | None = None


class ClassificationRecord(BaseModel):
    """Kafka message to publish on classifications topic"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transcript_entry_id: str | None = None
    incident_id: str
    type: ClassificationType
    confidence: float
    summary: str | None = None
    entities: ExtractedEntities
    action_item_owner: str | None = None
    requires_followup: bool = False
    speaker_name: str | None = None
    speaker_role: str | None = None
    original_text: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ContextWindowEntry(BaseModel):
    """Single entry in the LLM context window (last N utterances)"""

    speaker_name: str | None = None
    role: str | None = None
    text: str
    ts: str
    classification_type: str | None = None
