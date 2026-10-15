"""Platform citation resolution; source text continues to come from KnowledgeService."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import CourseFile, SourceChunk
from app.schemas.domain import RetrievedChunk, SourceReference
from app.services.knowledge.store import concept_evidence_filter


def resolve_context_sources(
    db: Session, course_id: UUID, concept_id: UUID, context: list[RetrievedChunk]
) -> list[RetrievedChunk]:
    # Select metadata only, never retrieve course material outside KnowledgeService.
    rows = db.execute(
        select(
            SourceChunk.id,
            SourceChunk.concept_id,
            SourceChunk.file_id,
            SourceChunk.page_number,
            SourceChunk.slide_number,
            SourceChunk.start_seconds,
            SourceChunk.end_seconds,
            CourseFile.source_type,
        )
        .join(CourseFile, SourceChunk.file_id == CourseFile.id)
        .where(
            SourceChunk.course_id == course_id,
            CourseFile.course_id == course_id,
            SourceChunk.id.in_([c.chunk_id for c in context]),
            concept_evidence_filter(concept_id, allow_unassigned=True),
        )
    ).all()
    by_id = {r.id: r for r in rows}
    resolved = []
    seen = set()
    for chunk in context:
        row = by_id.get(chunk.chunk_id)
        if row is None or chunk.course_id != course_id or chunk.chunk_id in seen:
            continue
        seen.add(chunk.chunk_id)
        resolved.append(
            chunk.model_copy(
                update={
                    "concept_id": concept_id,
                    "source": SourceReference(
                        file_id=row.file_id,
                        source_type=row.source_type,
                        page_number=row.page_number,
                        slide_number=row.slide_number,
                        start_seconds=row.start_seconds,
                        end_seconds=row.end_seconds,
                    ),
                }
            )
        )
    return resolved
