"""Internal curriculum drafts. Sources are numbered; UUIDs/locations are never generated."""

from pydantic import BaseModel, ConfigDict, Field


class ConceptDraft(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    difficulty: int = Field(default=1, ge=1, le=3)
    source_numbers: list[int] = Field(min_length=1)
    prerequisite_names: list[str] = Field(default_factory=list, max_length=2)


class TopicDraft(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    concepts: list[ConceptDraft] = Field(min_length=1, max_length=20)


class ChapterDraft(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    topics: list[TopicDraft] = Field(min_length=1, max_length=12)


class CourseDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")
    chapters: list[ChapterDraft] = Field(min_length=1, max_length=12)
