"""
Unit tests for report-generator — config defaults, markdown renderer,
and ISR context building logic. No S3/Slack/LLM credentials required.
"""

from src.config import Settings
from src.renderers.markdown_renderer import render_markdown_isr


# ─── Settings defaults ────────────────────────────────────────

def test_settings_service_name():
    s = Settings()
    assert s.service_name == "vaic-report-generator"


def test_settings_port():
    s = Settings()
    assert s.port == 8005


def test_settings_gemini_model_default():
    s = Settings()
    assert "gemini" in s.gemini_model.lower()


def test_settings_aws_region_default():
    s = Settings()
    assert s.aws_region == "us-east-1"


def test_settings_slack_disabled_by_default():
    s = Settings()
    assert s.enable_slack is False


def test_settings_api_base_url():
    s = Settings()
    assert s.api_base_url.startswith("http")


# ─── Markdown renderer ────────────────────────────────────────

MINIMAL_CONTEXT = {
    "incident": {
        "id": "inc-001",
        "title": "Database Outage — eu-west-1",
        "severity": "P1",
        "status": "RESOLVED",
        "startTs": "2024-01-01T10:00:00Z",
        "resolvedTs": "2024-01-01T11:30:00Z",
        "affectedSystems": ["postgres", "redis"],
    },
    "executive_summary": "PostgreSQL replication lag caused a 90-minute outage.",
    "mttr_minutes": 90,
    "generated_at": "2024-01-01T11:35:00Z",
    "participants": [],
    "facts": [],
    "hypotheses": [],
    "decisions": [],
    "action_items": [],
    "questions": [],
    "conflicts": [],
    "timeline": [],
}


def test_markdown_render_returns_string():
    md = render_markdown_isr(MINIMAL_CONTEXT)
    assert isinstance(md, str)
    assert len(md) > 0


def test_markdown_contains_incident_title():
    md = render_markdown_isr(MINIMAL_CONTEXT)
    assert "Database Outage" in md


def test_markdown_contains_severity():
    md = render_markdown_isr(MINIMAL_CONTEXT)
    assert "P1" in md


def test_markdown_contains_mttr():
    md = render_markdown_isr(MINIMAL_CONTEXT)
    assert "90" in md


def test_markdown_contains_executive_summary():
    md = render_markdown_isr(MINIMAL_CONTEXT)
    assert "PostgreSQL replication lag" in md


def test_markdown_contains_section_headers():
    md = render_markdown_isr(MINIMAL_CONTEXT)
    assert "## Executive Summary" in md
    assert "## Confirmed Facts" in md
    assert "## Key Decisions" in md
    assert "## Action Items" in md


def test_markdown_affected_systems_joined():
    md = render_markdown_isr(MINIMAL_CONTEXT)
    assert "postgres" in md
    assert "redis" in md


def test_markdown_with_facts():
    ctx = {**MINIMAL_CONTEXT, "facts": [
        {"content": "DB latency spiked to 12s", "confidence": 0.95,
         "createdAt": "2024-01-01T10:05:00Z", "status": "CONFIRMED"},
        {"content": "Migration script caused index lock", "confidence": 0.80,
         "createdAt": "2024-01-01T10:10:00Z", "status": "CONFIRMED"},
    ]}
    md = render_markdown_isr(ctx)
    assert "DB latency spiked" in md
    assert "Migration script" in md


def test_markdown_with_decisions():
    ctx = {**MINIMAL_CONTEXT, "decisions": [
        {"content": "Fail over writes to eu-west-2 replica", "createdAt": "2024-01-01T10:15:00Z"},
    ]}
    md = render_markdown_isr(ctx)
    assert "Fail over writes" in md


def test_markdown_with_action_items():
    ctx = {**MINIMAL_CONTEXT, "action_items": [
        {"content": "Root cause analysis", "ownerName": "Alice", "status": "PENDING"},
    ]}
    md = render_markdown_isr(ctx)
    assert "Root cause analysis" in md
    assert "Alice" in md


def test_markdown_generated_by_footer():
    md = render_markdown_isr(MINIMAL_CONTEXT)
    assert "VAIC" in md
