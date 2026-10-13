"""Internal structured inference contracts shared by providers and application services."""

from pydantic import BaseModel, Field


class TutorDraft(BaseModel):
    answer: str
    source_chunk_ids: list[str] = Field(default_factory=list)
