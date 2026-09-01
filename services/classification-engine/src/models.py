from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
import uuid
from datetime import datetime, timezone


class ClassificationType(str, Enum):
    FACT = "FACT"
    HYPOTHESIS = "HYPOTHESIS"
    DECISION = "DECISION"
    ACTION_ITEM = "ACTION_ITEM"
    QUESTION = "QUESTION"
    STATUS_UPDATE = "STATUS_UPDATE"
    SOCIAL = "SOCIAL"


class ExtractedEntities(BaseModel):
    systems: List[str] = Field(default_factory=list)
    people: List[str] = Field(default_factory=list)
    timestamps: List[str] = Field(default_factory=list)
    metrics: List[str] = Field(default_factory=list)
    error_codes: List[str] = Field(default_factory=list)
    urls: List[str] = Field(default_factory=list)
    tools: List[str] = Field(default_factory=list)


class ClaudeClassificationResponse(BaseModel):
    """
    Schema that Claude must return for each utterance.
    Matches the classification prompt schema in System Design §7.1.
    """
    type: ClassificationType
    confidence: float = Field(ge=0.0, le=1.0)
    summary: str
    entities: ExtractedEntities = Field(default_factory=ExtractedEntities)
    action_item_owner: Optional[str] = None
    requires_followup: bool = False


class TranscriptEntryMessage(BaseModel):
    """Kafka message from transcript.entries topic"""
    incident_id: str
    participant_id: Optional[str] = None
    speaker_label: Optional[str] = None
    speaker_name: Optional[str] = None
    speaker_role: Optional[str] = None
    content: str
    start_ts: str
    end_ts: str
    confidence: float = 1.0
    audio_ref: Optional[str] = None


class ClassificationRecord(BaseModel):
    """Kafka message to publish on classifications topic"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transcript_entry_id: Optional[str] = None
    incident_id: str
    type: ClassificationType
    confidence: float
    summary: Optional[str] = None
    entities: ExtractedEntities
    action_item_owner: Optional[str] = None
    requires_followup: bool = False
    speaker_name: Optional[str] = None
    speaker_role: Optional[str] = None
    original_text: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ContextWindowEntry(BaseModel):
    """Single entry in the LLM context window (last N utterances)"""
    speaker_name: Optional[str]
    role: Optional[str]
    text: str
    ts: str
    classification_type: Optional[str] = None
