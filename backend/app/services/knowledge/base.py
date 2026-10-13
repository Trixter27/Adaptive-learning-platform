from typing import Protocol
from uuid import UUID

from app.schemas.domain import CourseMap, RetrievedChunk


class KnowledgeService(Protocol):
    async def process_course(self, course_id: UUID) -> None: ...
    async def retrieve_context(
        self, course_id: UUID, query: str, concept_id: UUID | None = None, top_k: int = 8
    ) -> list[RetrievedChunk]: ...
    async def get_course_map(self, course_id: UUID) -> CourseMap: ...
