from datetime import datetime
from enum import Enum
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Score = Annotated[float, Field(ge=0, le=1)]
Difficulty = Annotated[int, Field(ge=1, le=3)]


class SourceType(str, Enum):
    pdf = "pdf"
    pptx = "pptx"
    video = "video"
    image = "image"
    text = "text"


class ChallengeMode(str, Enum):
    mcq = "mcq"
    matching = "matching"
    sequence = "sequence"
    short_answer = "short_answer"
    numerical = "numerical"


class NextAction(str, Enum):
    continue_ = "continue"
    remediate = "remediate"
    advance = "advance"
    review = "review"


class AnswerType(str, Enum):
    source_backed = "source_backed"
    source_inferred = "source_inferred"
    general_knowledge = "general_knowledge"


class ProcessingStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ProcessingStage(str, Enum):
    queued = "queued"
    extracting_content = "extracting_content"
    analyzing_content = "analyzing_content"
    building_course = "building_course"
    creating_embeddings = "creating_embeddings"
    indexing = "indexing"
    completed = "completed"


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class User(ORMModel):
    id: UUID
    clerk_user_id: str
    created_at: datetime


class CourseCreate(RequestModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=10000)


class Course(ORMModel):
    id: UUID
    user_id: UUID
    title: str
    description: str
    created_at: datetime
    updated_at: datetime


class CourseFile(ORMModel):
    id: UUID
    course_id: UUID
    filename: str
    source_type: SourceType
    object_key: str
    content_type: str
    size_bytes: int = Field(ge=0)
    upload_completed: bool
    created_at: datetime


class UploadRequest(RequestModel):
    course_id: UUID
    filename: str = Field(min_length=1, max_length=255)
    source_type: SourceType
    content_type: str = Field(min_length=1, max_length=100)
    size_bytes: int = Field(ge=0, le=100_000_000)


class UploadInfo(BaseModel):
    file_id: UUID
    object_key: str
    upload_url: str
    method: str = "PUT"
    headers: dict[str, str]
    expires_in_seconds: int = 900


class UploadComplete(RequestModel):
    file_id: UUID


class ProcessRequest(RequestModel):
    file_id: UUID | None = None


class ProcessingJob(ORMModel):
    id: UUID
    course_id: UUID
    file_id: UUID | None
    status: ProcessingStatus
    stage: ProcessingStage
    progress: int = Field(ge=0, le=100)
    error: str | None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None


class Concept(ORMModel):
    id: UUID
    topic_id: UUID
    name: str
    description: str
    difficulty: Difficulty


class ConceptPrerequisite(ORMModel):
    concept_id: UUID
    prerequisite_concept_id: UUID


class Topic(ORMModel):
    id: UUID
    chapter_id: UUID
    title: str
    order_index: int
    concepts: list[Concept] = Field(default_factory=list)


class Chapter(ORMModel):
    id: UUID
    course_id: UUID
    title: str
    order_index: int
    topics: list[Topic] = Field(default_factory=list)


class CourseMap(BaseModel):
    course_id: UUID
    chapters: list[Chapter]
    prerequisites: list[ConceptPrerequisite]


class SourceReference(BaseModel):
    file_id: UUID
    source_type: SourceType
    page_number: int | None = Field(default=None, ge=1)
    slide_number: int | None = Field(default=None, ge=1)
    start_seconds: float | None = Field(default=None, ge=0)
    end_seconds: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def timestamp_order(self) -> "SourceReference":
        if self.end_seconds is not None and (
            self.start_seconds is None or self.end_seconds < self.start_seconds
        ):
            raise ValueError("end_seconds requires start_seconds and must not precede it")
        return self


class SourceChunk(ORMModel):
    id: UUID
    course_id: UUID
    concept_id: UUID | None
    content: str
    source: SourceReference


class RetrievedChunk(BaseModel):
    chunk_id: UUID
    course_id: UUID
    concept_id: UUID | None
    content: str
    score: Score
    source: SourceReference


class Challenge(ORMModel):
    id: UUID
    concept_id: UUID
    mode: ChallengeMode
    title: str
    prompt: str
    difficulty: Difficulty
    xp_reward: int = Field(ge=0)
    content: dict[str, Any]
    source_chunk_ids: list[UUID]


class NextChallengeRequest(RequestModel):
    course_id: UUID
    concept_id: UUID | None = None


class AttemptRequest(RequestModel):
    challenge_id: UUID
    answer: dict[str, Any]
    time_taken_seconds: float = Field(ge=0, le=86400)


class AssessmentResult(BaseModel):
    correct: bool
    score: Score
    feedback: str
    misconception: str | None = None
    mastery_before: Score
    mastery_after: Score
    next_action: NextAction
    sources: list[SourceReference] = Field(default_factory=list)


class Attempt(ORMModel):
    id: UUID
    user_id: UUID
    challenge_id: UUID
    answer: dict[str, Any]
    time_taken_seconds: float
    assessment: AssessmentResult
    created_at: datetime


class MasteryState(ORMModel):
    user_id: UUID
    concept_id: UUID
    mastery_score: Score
    attempt_count: int = Field(ge=0)
    correct_count: int = Field(ge=0)
    last_updated: datetime


class ProgressResponse(BaseModel):
    course_id: UUID
    mastery: list[MasteryState]
    average_mastery: Score


class Quest(ORMModel):
    id: UUID
    course_id: UUID
    chapter_id: UUID | None
    title: str
    description: str
    challenge_ids: list[UUID]


class GameState(ORMModel):
    course_id: UUID
    current_chapter_id: UUID | None
    current_concept_id: UUID | None
    xp: int = Field(ge=0)
    level: int = Field(ge=1)
    completed_challenges: list[UUID]
    unlocked_chapter_ids: list[UUID]


class TutorRequest(RequestModel):
    course_id: UUID
    concept_id: UUID | None = None
    message: str = Field(min_length=1, max_length=10000)


class TutorResponse(BaseModel):
    answer: str
    answer_type: AnswerType
    sources: list[SourceReference]


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail
