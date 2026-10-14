"""Database-authoritative chunk storage shared by API and worker processes."""

from typing import Protocol
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import domain as m
from app.schemas import domain as s
from app.services.knowledge.embeddings import normalize


class ChunkStore(Protocol):
    def add(self, chunks: list[m.SourceChunk]) -> None: ...
    def get_by_ids(
        self, course_id: UUID, ids: list[UUID], concept_id: UUID | None = None
    ) -> list[s.RetrievedChunk]: ...
    def search(
        self, course_id: UUID, vector: list[float], top_k: int = 8, concept_id: UUID | None = None
    ) -> list[s.RetrievedChunk]: ...


def concept_evidence_filter(concept_id: UUID, *, allow_unassigned: bool = False):
    associated = (
        select(m.SourceChunkConcept.chunk_id)
        .where(
            m.SourceChunkConcept.chunk_id == m.SourceChunk.id,
            m.SourceChunkConcept.concept_id == concept_id,
        )
        .exists()
    )
    conditions = [m.SourceChunk.concept_id == concept_id, associated]
    if allow_unassigned:
        conditions.append(m.SourceChunk.concept_id.is_(None))
    return or_(*conditions)


def scoped_chunks(course_id: UUID, concept_id: UUID | None = None):
    statement = (
        select(m.SourceChunk)
        .join(
            m.CourseFile,
            (m.CourseFile.id == m.SourceChunk.file_id) & (m.CourseFile.course_id == course_id),
        )
        .where(m.SourceChunk.course_id == course_id)
    )
    if concept_id is not None:
        statement = statement.where(concept_evidence_filter(concept_id))
    return statement


def vector_search_statement(course_id, vector, top_k, concept_id=None):
    distance = m.SourceChunk.embedding.cosine_distance(vector).label("distance")
    return (
        scoped_chunks(course_id, concept_id)
        .add_columns(distance)
        .where(m.SourceChunk.embedding.is_not(None))
        .order_by(distance, m.SourceChunk.id)
        .limit(max(0, top_k))
    )


class DatabaseChunkStore:
    def __init__(self, db: Session):
        self.db = db

    def add(self, chunks: list[m.SourceChunk]) -> None:
        for chunk in chunks:
            chunk.embedding = normalize(chunk.embedding)
            file = self.db.get(m.CourseFile, chunk.file_id)
            if file is None or file.course_id != chunk.course_id:
                raise ValueError("Chunk file must belong to its course.")
            if chunk.concept_id is not None:
                course_id = self.db.scalar(
                    select(m.Chapter.course_id)
                    .join(m.Topic)
                    .join(m.Concept)
                    .where(m.Concept.id == chunk.concept_id)
                )
                if course_id != chunk.course_id:
                    raise ValueError("Chunk concept must belong to its course.")
        self.db.add_all(chunks)
        self.db.flush()

    def source_reference(self, chunk: m.SourceChunk) -> s.SourceReference:
        file = self.db.get(m.CourseFile, chunk.file_id)
        return s.SourceReference(
            file_id=file.id,
            source_type=file.source_type,
            page_number=chunk.page_number,
            slide_number=chunk.slide_number,
            start_seconds=chunk.start_seconds,
            end_seconds=chunk.end_seconds,
        )

    def retrieved(self, chunk, score=1.0, concept_id=None):
        return s.RetrievedChunk(
            chunk_id=chunk.id,
            course_id=chunk.course_id,
            concept_id=concept_id if concept_id is not None else chunk.concept_id,
            content=chunk.content,
            score=max(0.0, min(1.0, score)),
            source=self.source_reference(chunk),
        )

    def get_by_ids(self, course_id, ids, concept_id=None):
        if not ids:
            return []
        rows = self.db.scalars(
            scoped_chunks(course_id, concept_id).where(m.SourceChunk.id.in_(ids))
        ).all()
        by_id = {row.id: row for row in rows}
        return [
            self.retrieved(by_id[id_], concept_id=concept_id)
            for id_ in dict.fromkeys(ids)
            if id_ in by_id
        ]

    def search(self, course_id, vector, top_k=8, concept_id=None):
        if top_k <= 0:
            return []
        vector = normalize(vector)
        if self.db.get_bind().dialect.name == "postgresql":
            rows = self.db.execute(vector_search_statement(course_id, vector, top_k, concept_id))
            # Map cosine [-1, 1] to public score [0, 1] in both dialects.
            return [
                self.retrieved(chunk, 1 - float(distance) / 2, concept_id)
                for chunk, distance in rows
            ]
        rows = self.db.scalars(
            scoped_chunks(course_id, concept_id).where(m.SourceChunk.embedding.is_not(None))
        ).all()
        scored = [
            (c, (1 + sum(a * b for a, b in zip(vector, normalize(c.embedding), strict=True))) / 2)
            for c in rows
        ]
        scored.sort(key=lambda pair: (-pair[1], str(pair[0].id)))
        return [self.retrieved(c, score, concept_id) for c, score in scored[:top_k]]


def course_map(db: Session, course_id: UUID) -> s.CourseMap:
    chapters = db.scalars(
        select(m.Chapter).where(m.Chapter.course_id == course_id).order_by(m.Chapter.order_index)
    ).all()
    concept_ids = (
        select(m.Concept.id).join(m.Topic).join(m.Chapter).where(m.Chapter.course_id == course_id)
    )
    prerequisites = db.scalars(
        select(m.ConceptPrerequisite)
        .where(m.ConceptPrerequisite.concept_id.in_(concept_ids))
        .order_by(m.ConceptPrerequisite.concept_id, m.ConceptPrerequisite.prerequisite_concept_id)
    ).all()
    return s.CourseMap(
        course_id=course_id,
        chapters=[s.Chapter.model_validate(c) for c in chapters],
        prerequisites=[s.ConceptPrerequisite.model_validate(p) for p in prerequisites],
    )
