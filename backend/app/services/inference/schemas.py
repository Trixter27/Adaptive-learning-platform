"""Internal structured inference contracts shared by providers and application services."""

from typing import Any
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    FiniteFloat,
    StrictBool,
    StrictInt,
    field_validator,
    model_validator,
)

from app.schemas.domain import ChallengeMode, Difficulty, Score


class TutorDraft(BaseModel):
    answer: str
    source_chunk_ids: list[str] = Field(default_factory=list)


class InternalSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OptionsContent(InternalSchema):
    options: list[str] = Field(min_length=2, max_length=8)


class MCQKey(InternalSchema):
    selected_option: StrictInt = Field(ge=0)


class MatchingContent(InternalSchema):
    left: list[str] = Field(min_length=2, max_length=12)
    right: list[str] = Field(min_length=2, max_length=12)


class MatchingKey(InternalSchema):
    matches: list[StrictInt]


class SequenceContent(InternalSchema):
    items: list[str] = Field(min_length=2, max_length=12)


class SequenceKey(InternalSchema):
    order: list[StrictInt]


class ShortAnswerContent(InternalSchema):
    hint: str | None = None


class ShortAnswerKey(InternalSchema):
    expected_answer: str = Field(min_length=1, max_length=10000)


class ShortAnswerInput(InternalSchema):
    text: str = Field(min_length=1, max_length=10000)


class NumericalContent(InternalSchema):
    unit: str | None = None


class NumericalInput(InternalSchema):
    value: FiniteFloat

    @field_validator("value", mode="before")
    @classmethod
    def reject_bool(cls, value):
        if isinstance(value, bool):
            raise ValueError("A number is required, not a boolean")
        return value


class NumericalKey(NumericalInput):
    tolerance: FiniteFloat = Field(ge=0)

    @field_validator("tolerance", mode="before")
    @classmethod
    def reject_boolean_tolerance(cls, value):
        if isinstance(value, bool):
            raise ValueError("Tolerance must be numeric")
        return value


MODE_SCHEMAS = {
    ChallengeMode.mcq: (OptionsContent, MCQKey),
    ChallengeMode.matching: (MatchingContent, MatchingKey),
    ChallengeMode.sequence: (SequenceContent, SequenceKey),
    ChallengeMode.short_answer: (ShortAnswerContent, ShortAnswerKey),
    ChallengeMode.numerical: (NumericalContent, NumericalKey),
}


def validate_question_parts(
    mode: ChallengeMode, content: dict[str, Any], answer_key: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Whitelist public fields and enforce deterministic answer-key invariants."""
    content_schema, key_schema = MODE_SCHEMAS[mode]
    public = content_schema.model_validate(content).model_dump(mode="json", exclude_none=True)
    private = key_schema.model_validate(answer_key).model_dump(mode="json")
    lists = [public[k] for k in ("options", "left", "right", "items") if k in public]
    for values in lists:
        normalized = [v.strip().casefold() for v in values]
        if any(not v for v in normalized) or len(set(normalized)) != len(normalized):
            raise ValueError("Options/items must be nonempty and distinct")
    if mode == ChallengeMode.mcq and private["selected_option"] >= len(public["options"]):
        raise ValueError("Correct option index is out of bounds")
    if mode == ChallengeMode.matching:
        if len(public["left"]) != len(public["right"]) or sorted(private["matches"]) != list(
            range(len(public["right"]))
        ):
            raise ValueError("Matching key must be a one-to-one permutation of right indices")
    if mode == ChallengeMode.sequence and sorted(private["order"]) != list(
        range(len(public["items"]))
    ):
        raise ValueError("Sequence key must be a permutation of all item indices")
    return public, private


class ChallengeDraft(InternalSchema):
    concept_id: UUID
    mode: ChallengeMode
    title: str = Field(min_length=1, max_length=200)
    prompt: str = Field(min_length=1, max_length=10000)
    difficulty: Difficulty
    content: dict[str, Any]
    answer_key: dict[str, Any]
    source_chunk_ids: list[UUID] = Field(min_length=1, max_length=8)

    @model_validator(mode="after")
    def valid_parts(self) -> "ChallengeDraft":
        self.content, self.answer_key = validate_question_parts(
            self.mode, self.content, self.answer_key
        )
        if len(set(self.source_chunk_ids)) != len(self.source_chunk_ids):
            raise ValueError("Source IDs must be distinct")
        return self


class QuestionVerificationDraft(InternalSchema):
    concept_id: UUID
    concept_relevant: StrictBool
    answerable: StrictBool
    answer_supported: StrictBool
    consistent: StrictBool
    unique_correct_answer: StrictBool
    numerical_usable: StrictBool
    source_chunk_ids: list[UUID] = Field(min_length=1)
    issues: list[str] = Field(default_factory=list)


class AssessmentDraft(InternalSchema):
    correct: StrictBool
    score: Score
    feedback: str = Field(min_length=1, max_length=10000)
    misconception: str | None = Field(default=None, max_length=2000)
    source_chunk_ids: list[UUID] = Field(min_length=1)
