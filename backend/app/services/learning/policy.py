"""Small, configurable learner policy. Functions have no database/model dependencies."""

import math
import re
import unicodedata

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.domain import NextAction


class LearningPolicy(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    guess: float = Field(default=0.20, gt=0, lt=1)
    slip: float = Field(default=0.10, gt=0, lt=1)
    learn: float = Field(default=0.15, ge=0, le=1)
    initial_mastery: float = Field(default=0.20, gt=0, lt=1)
    introductory_threshold: float = Field(default=0.35, gt=0, lt=1)
    advanced_threshold: float = Field(default=0.75, gt=0, lt=1)
    advance_threshold: float = Field(default=0.80, gt=0, le=1)
    review_failures: int = Field(default=3, ge=2, le=20)
    history_limit: int = Field(default=20, ge=3, le=100)
    generation_attempts: int = Field(default=3, ge=1, le=5)
    model_timeout_seconds: float = Field(default=30, gt=0, le=120)
    passing_score: float = Field(default=0.80, gt=0, le=1)
    xp_reward: int = Field(default=20, ge=0, le=100)

    @model_validator(mode="after")
    def valid_policy(self) -> "LearningPolicy":
        if self.guess + self.slip >= 1:
            raise ValueError("guess + slip must be less than 1")
        if not self.introductory_threshold < self.advanced_threshold <= self.advance_threshold:
            raise ValueError("Difficulty/action thresholds must be ordered")
        if self.review_failures > self.history_limit:
            raise ValueError("history_limit must cover review_failures")
        return self


def bkt_update(p: float, correct: bool, policy: LearningPolicy) -> float:
    """Bayes observation update followed by the learning transition; no forgetting term."""
    if not math.isfinite(p) or not 0 <= p <= 1:
        raise ValueError("Prior mastery must be finite and between 0 and 1")
    learned_likelihood = 1 - policy.slip if correct else policy.slip
    unlearned_likelihood = policy.guess if correct else 1 - policy.guess
    posterior = p * learned_likelihood / (p * learned_likelihood + (1 - p) * unlearned_likelihood)
    return min(1.0, max(0.0, posterior + (1 - posterior) * policy.learn))


def adaptive_difficulty(
    mastery: float, attempt_count: int, concept_difficulty: int, policy: LearningPolicy
) -> int:
    if attempt_count == 0:
        return min(2, max(1, concept_difficulty))
    if mastery < policy.introductory_threshold:
        return 1
    return 2 if mastery < policy.advanced_threshold else 3


def next_action(
    mastery: float, recent_correctness: list[bool], policy: LearningPolicy
) -> NextAction:
    """History is newest first, including the current observation."""
    if len(recent_correctness) >= policy.review_failures and not any(
        recent_correctness[: policy.review_failures]
    ):
        return NextAction.review
    if recent_correctness and not recent_correctness[0] and mastery < policy.introductory_threshold:
        return NextAction.remediate
    if mastery >= policy.advance_threshold:
        return NextAction.advance
    return NextAction.continue_


def normalize_prompt(prompt: str) -> str:
    text = unicodedata.normalize("NFKC", prompt).casefold()
    return " ".join(re.findall(r"[^\W_]+", text, flags=re.UNICODE))
