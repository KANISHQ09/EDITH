"""
Unit tests for classification-engine models and pure logic.
No external dependencies (Kafka, LLM APIs) required.
"""

import pytest
from pydantic import ValidationError

from ..src.models import (
    ClassificationRecord,
    ClassificationType,
    ClaudeClassificationResponse,
    ContextWindowEntry,
    ExtractedEntities,
    TranscriptEntryMessage,
)


# ─── ClassificationType ───────────────────────────────────────

def test_classification_type_values():
    assert ClassificationType.FACT == "FACT"
    assert ClassificationType.HYPOTHESIS == "HYPOTHESIS"
    assert ClassificationType.DECISION == "DECISION"
    assert ClassificationType.ACTION_ITEM == "ACTION_ITEM"
    assert ClassificationType.QUESTION == "QUESTION"
    assert ClassificationType.STATUS_UPDATE == "STATUS_UPDATE"
    assert ClassificationType.SOCIAL == "SOCIAL"


def test_classification_type_all_members():
    members = {e.value for e in ClassificationType}
    expected = {"FACT", "HYPOTHESIS", "DECISION", "ACTION_ITEM", "QUESTION", "STATUS_UPDATE", "SOCIAL"}
    assert members == expected


# ─── ExtractedEntities ───────────────────────────────────────

def test_extracted_entities_defaults():
    e = ExtractedEntities()
    assert e.systems == []
    assert e.people == []
    assert e.timestamps == []
    assert e.metrics == []
    assert e.error_codes == []
    assert e.urls == []
    assert e.tools == []


def test_extracted_entities_populated():
    e = ExtractedEntities(
        systems=["postgres", "redis"],
        people=["Alice", "Bob"],
        error_codes=["CONN_TIMEOUT"],
    )
    assert "postgres" in e.systems
    assert "Alice" in e.people
    assert "CONN_TIMEOUT" in e.error_codes


# ─── ClaudeClassificationResponse ────────────────────────────

def test_claude_response_valid():
    resp = ClaudeClassificationResponse(
        type=ClassificationType.FACT,
        confidence=0.95,
        summary="Database latency spiked to 12 seconds.",
    )
    assert resp.type == ClassificationType.FACT
    assert resp.confidence == 0.95
    assert resp.action_item_owner is None
    assert resp.requires_followup is False


def test_claude_response_confidence_bounds():
    with pytest.raises(ValidationError):
        ClaudeClassificationResponse(
            type=ClassificationType.FACT,
            confidence=1.5,  # > 1.0 — invalid
            summary="bad confidence",
        )


def test_claude_response_confidence_lower_bound():
    with pytest.raises(ValidationError):
        ClaudeClassificationResponse(
            type=ClassificationType.FACT,
            confidence=-0.1,  # < 0.0 — invalid
            summary="bad confidence",
        )


def test_claude_response_with_owner():
    resp = ClaudeClassificationResponse(
        type=ClassificationType.ACTION_ITEM,
        confidence=0.88,
        summary="Kill the migration lock in pg_stat_activity.",
        action_item_owner="Dave",
        requires_followup=True,
    )
    assert resp.action_item_owner == "Dave"
    assert resp.requires_followup is True


# ─── TranscriptEntryMessage ───────────────────────────────────

def test_transcript_entry_required_fields():
    msg = TranscriptEntryMessage(
        incident_id="inc-001",
        content="Latency is through the roof.",
        start_ts="2024-01-01T10:00:00Z",
        end_ts="2024-01-01T10:00:05Z",
    )
    assert msg.incident_id == "inc-001"
    assert msg.confidence == 1.0  # default


def test_transcript_entry_missing_required_raises():
    with pytest.raises(ValidationError):
        TranscriptEntryMessage(
            incident_id="inc-001",
            # missing content, start_ts, end_ts
        )


# ─── ClassificationRecord ─────────────────────────────────────

def test_classification_record_auto_id():
    rec = ClassificationRecord(
        incident_id="inc-001",
        type=ClassificationType.DECISION,
        confidence=0.9,
        entities=ExtractedEntities(),
        original_text="We should fail over now.",
    )
    assert rec.id  # auto-generated UUID
    assert rec.created_at  # auto-generated timestamp


def test_classification_record_id_uniqueness():
    kwargs = dict(
        incident_id="inc-001",
        type=ClassificationType.FACT,
        confidence=0.85,
        entities=ExtractedEntities(),
        original_text="DB is down.",
    )
    r1 = ClassificationRecord(**kwargs)
    r2 = ClassificationRecord(**kwargs)
    assert r1.id != r2.id


# ─── ContextWindowEntry ───────────────────────────────────────

def test_context_window_entry():
    entry = ContextWindowEntry(
        speaker_name="Alice",
        role="SRE",
        text="Postgres is throwing connection errors.",
        ts="14:01:00Z",
        classification_type="FACT",
    )
    assert entry.text == "Postgres is throwing connection errors."
    assert entry.classification_type == "FACT"


def test_context_window_entry_optional_fields():
    entry = ContextWindowEntry(text="Hello", ts="14:00:00Z")
    assert entry.speaker_name is None
    assert entry.role is None
    assert entry.classification_type is None
