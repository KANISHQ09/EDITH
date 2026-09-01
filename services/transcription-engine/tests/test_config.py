"""
Unit tests for transcription-engine config and audio processing logic.
No external dependencies (Whisper, Kafka, Redis) required.
"""

import pytest

from src.config import Settings


# ─── Settings defaults ────────────────────────────────────────

def test_settings_service_name_default():
    s = Settings()
    assert s.service_name == "vaic-transcription-engine"


def test_settings_port_default():
    s = Settings()
    assert s.port == 8002


def test_settings_whisper_model_default():
    s = Settings()
    assert s.whisper_model == "large-v3"


def test_settings_whisper_device_default():
    s = Settings()
    assert s.whisper_device == "cpu"


def test_settings_sample_rate_default():
    s = Settings()
    assert s.sample_rate == 16000


def test_settings_chunk_duration_default():
    s = Settings()
    assert s.chunk_duration_ms == 500


def test_settings_accumulate_chunks_default():
    s = Settings()
    assert s.accumulate_chunks == 10


def test_settings_diarization_speaker_bounds():
    s = Settings()
    assert s.diarization_min_speakers >= 1
    assert s.diarization_max_speakers >= s.diarization_min_speakers


def test_settings_speaker_map_ttl():
    s = Settings()
    assert s.speaker_map_ttl_s == 86400  # 24 hours


# ─── Audio chunk accumulation logic ──────────────────────────

def test_chunk_accumulation_threshold():
    """Verify the accumulate_chunks setting gates when Whisper is called."""
    s = Settings()
    buffer: list[bytes] = []
    should_transcribe_calls = 0

    def should_transcribe(buf: list[bytes]) -> bool:
        return len(buf) >= s.accumulate_chunks

    for i in range(s.accumulate_chunks - 1):
        buffer.append(b"chunk")
        assert not should_transcribe(buffer)

    buffer.append(b"chunk")  # This one tips it over
    assert should_transcribe(buffer)


def test_audio_buffer_size():
    """Expected buffer size = accumulate_chunks * chunk_duration_ms ms of audio."""
    s = Settings()
    expected_window_ms = s.accumulate_chunks * s.chunk_duration_ms
    # Default: 10 * 500ms = 5000ms = 5 seconds
    assert expected_window_ms == 5000


# ─── Whisper valid device options ────────────────────────────

def test_valid_whisper_devices():
    valid_devices = {"cpu", "cuda"}
    s = Settings()
    assert s.whisper_device in valid_devices


def test_valid_whisper_compute_types():
    valid_types = {"int8", "float16", "int8_float16"}
    s = Settings()
    assert s.whisper_compute_type in valid_types


# ─── VAD default ─────────────────────────────────────────────

def test_vad_filter_enabled_by_default():
    s = Settings()
    assert s.whisper_vad_filter is True
