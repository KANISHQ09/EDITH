"""
Unit tests for conflict-detector pure logic (cosine similarity, threshold).
No external dependencies (Kafka, Redis, LLM APIs) required.
"""

import math

import pytest


# ─── Cosine Similarity (inline — mirrors detector.py logic) ──

def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


SIMILARITY_THRESHOLD = 0.85


def test_identical_vectors_similarity():
    v = [1.0, 0.0, 0.5, -0.3]
    assert cosine_similarity(v, v) == pytest.approx(1.0, abs=1e-6)


def test_orthogonal_vectors_similarity():
    a = [1.0, 0.0]
    b = [0.0, 1.0]
    assert cosine_similarity(a, b) == pytest.approx(0.0, abs=1e-6)


def test_opposite_vectors_similarity():
    a = [1.0, 0.0]
    b = [-1.0, 0.0]
    assert cosine_similarity(a, b) == pytest.approx(-1.0, abs=1e-6)


def test_high_similarity_triggers_threshold():
    # Two nearly identical embeddings should exceed threshold
    a = [0.9, 0.1, 0.3]
    b = [0.91, 0.09, 0.31]
    sim = cosine_similarity(a, b)
    assert sim > SIMILARITY_THRESHOLD


def test_low_similarity_does_not_trigger_threshold():
    a = [1.0, 0.0, 0.0]
    b = [0.0, 0.0, 1.0]
    sim = cosine_similarity(a, b)
    assert sim < SIMILARITY_THRESHOLD


def test_zero_vector_returns_zero():
    a = [0.0, 0.0, 0.0]
    b = [1.0, 2.0, 3.0]
    assert cosine_similarity(a, b) == 0.0


def test_similarity_is_commutative():
    a = [0.5, 0.8, -0.2]
    b = [0.3, 0.6, 0.9]
    assert cosine_similarity(a, b) == pytest.approx(cosine_similarity(b, a), abs=1e-9)


def test_similarity_normalized_vectors():
    # Unit vectors — dot product equals cosine similarity
    a = [1.0, 0.0, 0.0]
    b = [0.0, 1.0, 0.0]
    assert cosine_similarity(a, b) == pytest.approx(0.0)

    c = [math.sqrt(0.5), math.sqrt(0.5), 0.0]
    assert cosine_similarity(a, c) == pytest.approx(math.sqrt(0.5), abs=1e-6)


# ─── Conflict detection rule ──────────────────────────────────

def should_check_conflict(sim: float) -> bool:
    return sim >= SIMILARITY_THRESHOLD


def test_threshold_boundary_above():
    assert should_check_conflict(0.85) is True
    assert should_check_conflict(0.99) is True
    assert should_check_conflict(1.0) is True


def test_threshold_boundary_below():
    assert should_check_conflict(0.84) is False
    assert should_check_conflict(0.0) is False
    assert should_check_conflict(-0.5) is False
