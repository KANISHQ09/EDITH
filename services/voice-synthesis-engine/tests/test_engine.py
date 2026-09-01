"""
Unit tests for voice-synthesis-engine — voice command detection and text
prefix constants. No TTS credentials or external APIs needed.
"""

import os

import pytest

# Disable actual TTS so no ElevenLabs/Polly calls are made
os.environ.setdefault("ENABLE_TTS", "false")

from src.engine import (
    VAIC_NOTICE_PREFIX,
    VAIC_SUMMARY_PREFIX,
    VOICE_COMMANDS,
    TTSProvider,
)


# ─── Constants ────────────────────────────────────────────────

def test_summary_prefix():
    assert VAIC_SUMMARY_PREFIX == "VAIC summary: "


def test_notice_prefix():
    assert VAIC_NOTICE_PREFIX == "VAIC notice: "


# ─── VOICE_COMMANDS map ───────────────────────────────────────

def test_voice_commands_not_empty():
    assert len(VOICE_COMMANDS) > 0


def test_voice_command_status():
    assert VOICE_COMMANDS.get("vaic, status") == "STATUS"
    assert VOICE_COMMANDS.get("vaic status") == "STATUS"


def test_voice_command_open_actions():
    assert VOICE_COMMANDS.get("vaic, open actions") == "OPEN_ACTIONS"
    assert VOICE_COMMANDS.get("vaic open actions") == "OPEN_ACTIONS"


def test_voice_command_confirm():
    assert VOICE_COMMANDS.get("vaic, confirm") == "CONFIRM"
    assert VOICE_COMMANDS.get("vaic confirm") == "CONFIRM"


def test_voice_command_reject():
    assert VOICE_COMMANDS.get("vaic, reject") == "REJECT"
    assert VOICE_COMMANDS.get("vaic reject") == "REJECT"


def test_voice_command_conflicts():
    assert VOICE_COMMANDS.get("vaic, conflicts") == "CONFLICTS"
    assert VOICE_COMMANDS.get("vaic conflicts") == "CONFLICTS"


def test_voice_command_what_we_know():
    assert VOICE_COMMANDS.get("vaic, what do we know") == "WHAT_WE_KNOW"
    assert VOICE_COMMANDS.get("vaic what do we know") == "WHAT_WE_KNOW"


def test_all_commands_have_comma_and_no_comma_variant():
    """Every 'vaic, X' command should also have a 'vaic X' variant."""
    comma_variants = {k for k in VOICE_COMMANDS if ", " in k}
    for cmd in comma_variants:
        plain = cmd.replace(", ", " ")
        assert plain in VOICE_COMMANDS, f"Missing plain variant for: '{cmd}'"


# ─── Voice command detection logic ───────────────────────────

def detect_voice_command(transcript: str) -> str | None:
    """Mirror of the detection logic in engine.py."""
    normalized = transcript.lower().strip()
    return VOICE_COMMANDS.get(normalized)


def test_detect_command_exact_match():
    assert detect_voice_command("vaic status") == "STATUS"


def test_detect_command_with_comma():
    assert detect_voice_command("vaic, status") == "STATUS"


def test_detect_command_case_insensitive():
    assert detect_voice_command("VAIC STATUS") == "STATUS"
    assert detect_voice_command("Vaic, Status") == "STATUS"


def test_detect_command_with_leading_trailing_whitespace():
    assert detect_voice_command("  vaic status  ") == "STATUS"


def test_detect_command_no_match():
    assert detect_voice_command("hello world") is None
    assert detect_voice_command("vaic do something else") is None


def test_detect_command_empty_string():
    assert detect_voice_command("") is None


# ─── TTSProvider (mock mode) ──────────────────────────────────

@pytest.mark.asyncio
async def test_tts_provider_returns_none_when_disabled():
    """When ENABLE_TTS=false, synthesize() should return None (no actual TTS call)."""
    provider = TTSProvider()
    result = await provider.synthesize("Test synthesis text.")
    assert result is None


def test_tts_provider_disabled_by_default_env():
    os.environ["ENABLE_TTS"] = "false"
    provider = TTSProvider()
    assert provider.use_elevenlabs is False
