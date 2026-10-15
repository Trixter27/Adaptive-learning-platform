import math

import pytest
from pydantic import ValidationError

from app.services.learning.policy import (
    LearningPolicy,
    adaptive_difficulty,
    bkt_update,
    next_action,
)


def test_bkt_correct_answer():
    assert bkt_update(0.2, True, LearningPolicy()) == pytest.approx(0.6)


def test_bkt_incorrect_answer():
    assert bkt_update(0.2, False, LearningPolicy()) == pytest.approx(0.17575757575757575)


def test_bkt_stays_in_range_at_boundaries_and_across_observations():
    for learn in [0.0, 0.15, 1.0]:
        policy = LearningPolicy(learn=learn)
        for n in range(101):
            for correct in [True, False]:
                value = bkt_update(n / 100, correct, policy)
                assert math.isfinite(value) and 0 <= value <= 1
        value = 0.2
        for correct in [True, False, False, True] * 100:
            value = bkt_update(value, correct, policy)
            assert 0 <= value <= 1


@pytest.mark.parametrize("value", [-0.1, 1.1, float("nan"), float("inf")])
def test_invalid_bkt_prior_rejected(value):
    with pytest.raises(ValueError):
        bkt_update(value, True, LearningPolicy())


@pytest.mark.parametrize(
    "kwargs",
    [
        {"guess": 0},
        {"slip": 1},
        {"guess": 0.95},
        {"learn": -1},
        {"introductory_threshold": 0.9},
        {"history_limit": 3, "review_failures": 4},
    ],
)
def test_policy_rejects_invalid_parameters(kwargs):
    with pytest.raises(ValidationError):
        LearningPolicy(**kwargs)


@pytest.mark.parametrize(
    "mastery,count,concept,expected",
    [
        (0.2, 0, 1, 1),
        (0.2, 0, 2, 2),
        (0.2, 0, 3, 2),
        (0.0, 1, 3, 1),
        (0.3499, 1, 3, 1),
        (0.35, 1, 1, 2),
        (0.7499, 1, 1, 2),
        (0.75, 1, 1, 3),
        (1.0, 1, 1, 3),
    ],
)
def test_adaptive_difficulty(mastery, count, concept, expected):
    assert adaptive_difficulty(mastery, count, concept, LearningPolicy()) == expected


@pytest.mark.parametrize(
    "mastery,history,expected",
    [
        (0.1, [False], "remediate"),
        (0.1, [False, False, False], "review"),
        (0.1, [False, True, False], "remediate"),
        (0.6, [False], "continue"),
        (0.8, [True], "advance"),
        (0.3, [True], "continue"),
        (0.2, [], "continue"),
    ],
)
def test_next_action(mastery, history, expected):
    assert next_action(mastery, history, LearningPolicy()) == expected
