from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    JSON,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin, UTCDateTime, utc_now


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"
    clerk_user_id: Mapped[str] = mapped_column(String(255), unique=True)
    courses: Mapped[list["Course"]] = relationship(back_populates="owner", passive_deletes=True)


class Course(IdMixin, TimestampMixin, Base):
    __tablename__ = "courses"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    owner: Mapped[User] = relationship(back_populates="courses")
    files: Mapped[list["CourseFile"]] = relationship(passive_deletes=True)
    chapters: Mapped[list["Chapter"]] = relationship(
        passive_deletes=True, order_by="Chapter.order_index"
    )


class CourseFile(IdMixin, TimestampMixin, Base):
    __tablename__ = "course_files"
    __table_args__ = (
        CheckConstraint("size_bytes >= 0", name="file_size_nonnegative"),
        CheckConstraint(
            "source_type IN ('pdf','pptx','video','image','text')", name="file_source_type"
        ),
    )
    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )
    filename: Mapped[str] = mapped_column(String(255))
    source_type: Mapped[str] = mapped_column(String(20))
    object_key: Mapped[str] = mapped_column(String(512), unique=True)
    content_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    upload_completed: Mapped[bool] = mapped_column(default=False)


class ProcessingJob(IdMixin, Base):
    __tablename__ = "processing_jobs"
    __table_args__ = (
        CheckConstraint("progress BETWEEN 0 AND 100", name="job_progress_range"),
        CheckConstraint(
            "status IN ('pending','processing','completed','failed')", name="job_status"
        ),
        CheckConstraint(
            "stage IN ('queued','extracting_content','analyzing_content','building_course','creating_embeddings','indexing','completed')",
            name="job_stage",
        ),
        Index("ix_jobs_poll", "status", "created_at"),
    )
    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )
    file_id: Mapped[UUID | None] = mapped_column(ForeignKey("course_files.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    stage: Mapped[str] = mapped_column(String(40), default="queued")
    progress: Mapped[int] = mapped_column(default=0)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)


class Chapter(IdMixin, TimestampMixin, Base):
    __tablename__ = "chapters"
    __table_args__ = (UniqueConstraint("course_id", "order_index"),)
    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    order_index: Mapped[int]
    topics: Mapped[list["Topic"]] = relationship(passive_deletes=True, order_by="Topic.order_index")


class Topic(IdMixin, TimestampMixin, Base):
    __tablename__ = "topics"
    __table_args__ = (UniqueConstraint("chapter_id", "order_index"),)
    chapter_id: Mapped[UUID] = mapped_column(
        ForeignKey("chapters.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    order_index: Mapped[int]
    concepts: Mapped[list["Concept"]] = relationship(passive_deletes=True)


class Concept(IdMixin, TimestampMixin, Base):
    __tablename__ = "concepts"
    __table_args__ = (CheckConstraint("difficulty BETWEEN 1 AND 3", name="concept_difficulty"),)
    topic_id: Mapped[UUID] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[int] = mapped_column(default=1)


class ConceptPrerequisite(IdMixin, Base):
    __tablename__ = "concept_prerequisites"
    __table_args__ = (
        UniqueConstraint("concept_id", "prerequisite_concept_id"),
        CheckConstraint("concept_id != prerequisite_concept_id", name="prerequisite_not_self"),
    )
    concept_id: Mapped[UUID] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"))
    prerequisite_concept_id: Mapped[UUID] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE")
    )


class SourceChunk(IdMixin, TimestampMixin, Base):
    __tablename__ = "source_chunks"
    __table_args__ = (
        CheckConstraint("page_number IS NULL OR page_number >= 1", name="chunk_page"),
        CheckConstraint("slide_number IS NULL OR slide_number >= 1", name="chunk_slide"),
        CheckConstraint("start_seconds IS NULL OR start_seconds >= 0", name="chunk_start"),
        CheckConstraint(
            "end_seconds IS NULL OR (start_seconds IS NOT NULL AND end_seconds >= start_seconds)",
            name="chunk_end",
        ),
    )
    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )
    file_id: Mapped[UUID] = mapped_column(
        ForeignKey("course_files.id", ondelete="CASCADE"), index=True
    )
    concept_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("concepts.id", ondelete="SET NULL"), index=True
    )
    content: Mapped[str] = mapped_column(Text)
    # Authoritative source metadata lives here; future pgvector migration adds embedding.
    page_number: Mapped[int | None]
    slide_number: Mapped[int | None]
    start_seconds: Mapped[float | None]
    end_seconds: Mapped[float | None]


class Challenge(IdMixin, TimestampMixin, Base):
    __tablename__ = "challenges"
    __table_args__ = (
        CheckConstraint("difficulty BETWEEN 1 AND 3", name="challenge_difficulty"),
        CheckConstraint("xp_reward >= 0", name="challenge_xp"),
        CheckConstraint(
            "mode IN ('mcq','matching','sequence','short_answer','numerical')",
            name="challenge_mode",
        ),
    )
    concept_id: Mapped[UUID] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), index=True
    )
    mode: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(200))
    prompt: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[int]
    xp_reward: Mapped[int] = mapped_column(default=20)
    content: Mapped[dict[str, Any]] = mapped_column(JSON)
    source_chunk_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    # Never serialized in public challenge responses.
    answer_key: Mapped[dict[str, Any]] = mapped_column(JSON)


class Attempt(IdMixin, TimestampMixin, Base):
    __tablename__ = "attempts"
    __table_args__ = (CheckConstraint("time_taken_seconds >= 0", name="attempt_duration"),)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    challenge_id: Mapped[UUID] = mapped_column(
        ForeignKey("challenges.id", ondelete="CASCADE"), index=True
    )
    answer: Mapped[dict[str, Any]] = mapped_column(JSON)
    time_taken_seconds: Mapped[float]
    assessment: Mapped[dict[str, Any]] = mapped_column(JSON)


class MasteryState(IdMixin, Base):
    __tablename__ = "mastery"
    __table_args__ = (
        UniqueConstraint("user_id", "concept_id"),
        CheckConstraint("mastery_score BETWEEN 0 AND 1", name="mastery_range"),
        CheckConstraint(
            "attempt_count >= 0 AND correct_count >= 0 AND correct_count <= attempt_count",
            name="mastery_counts",
        ),
    )
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    concept_id: Mapped[UUID] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), index=True
    )
    mastery_score: Mapped[float] = mapped_column(default=0.0)
    attempt_count: Mapped[int] = mapped_column(default=0)
    correct_count: Mapped[int] = mapped_column(default=0)
    last_updated: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)


class Quest(IdMixin, TimestampMixin, Base):
    __tablename__ = "quests"
    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )
    chapter_id: Mapped[UUID | None] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    challenge_ids: Mapped[list[str]] = mapped_column(JSON, default=list)


class GameState(IdMixin, TimestampMixin, Base):
    __tablename__ = "game_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id"),
        CheckConstraint("xp >= 0 AND level >= 1", name="game_values"),
    )
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )
    current_chapter_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("chapters.id", ondelete="SET NULL")
    )
    current_concept_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("concepts.id", ondelete="SET NULL")
    )
    xp: Mapped[int] = mapped_column(default=0)
    level: Mapped[int] = mapped_column(default=1)
    completed_challenges: Mapped[list[str]] = mapped_column(JSON, default=list)
    unlocked_chapter_ids: Mapped[list[str]] = mapped_column(JSON, default=list)


class TutorConversation(IdMixin, TimestampMixin, Base):
    __tablename__ = "tutor_conversations"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )


class TutorMessage(IdMixin, TimestampMixin, Base):
    __tablename__ = "tutor_messages"
    conversation_id: Mapped[UUID] = mapped_column(
        ForeignKey("tutor_conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    answer_type: Mapped[str | None] = mapped_column(String(30))
    source_chunk_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
