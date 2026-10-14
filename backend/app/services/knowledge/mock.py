from uuid import UUID, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import domain as m
from app.schemas import domain as s
from app.services.knowledge.store import DatabaseChunkStore, course_map, scoped_chunks


class MockKnowledgeService:
    """Persist a deterministic illustrative course; no uploaded content is parsed."""

    def __init__(self, db: Session):
        self.db = db

    async def process_course(self, course_id: UUID) -> None:
        if self.db.scalar(select(m.Chapter.id).where(m.Chapter.course_id == course_id)):
            return
        # Always cite an explicit synthetic source. Uploaded content is not parsed,
        # so attributing these fixture statements to an uploaded PDF would be false.
        file = m.CourseFile(
            id=uuid5(course_id, "mock-file"),
            course_id=course_id,
            filename="mock-learning-notes.txt",
            source_type="text",
            object_key=f"fixtures/{course_id}/notes.txt",
            content_type="text/plain",
            size_bytes=0,
            upload_completed=True,
        )
        self.db.add(file)
        self.db.flush()
        chapter = m.Chapter(
            id=uuid5(course_id, "chapter-1"),
            course_id=course_id,
            title="Learning foundations (mock)",
            order_index=0,
        )
        self.db.add(chapter)
        self.db.flush()
        topic = m.Topic(
            id=uuid5(course_id, "topic-1"),
            chapter_id=chapter.id,
            title="Effective practice",
            order_index=0,
        )
        self.db.add(topic)
        self.db.flush()
        concepts = [
            (
                "active-recall",
                "Active recall",
                "Active recall means retrieving information from memory instead of rereading notes.",
                1,
            ),
            (
                "spaced-practice",
                "Spaced practice",
                "Spaced practice distributes retrieval sessions over time to strengthen retention.",
                2,
            ),
        ]
        for key, name, description, difficulty in concepts:
            concept = m.Concept(
                id=uuid5(course_id, key),
                topic_id=topic.id,
                name=name,
                description=description,
                difficulty=difficulty,
            )
            self.db.add(concept)
            self.db.flush()
            self.db.add(
                m.SourceChunk(
                    id=uuid5(course_id, f"chunk-{key}"),
                    course_id=course_id,
                    file_id=file.id,
                    concept_id=concept.id,
                    content=description,
                )
            )
        self.db.add(
            m.ConceptPrerequisite(
                concept_id=uuid5(course_id, "spaced-practice"),
                prerequisite_concept_id=uuid5(course_id, "active-recall"),
            )
        )
        self.db.add(
            m.Quest(
                id=uuid5(course_id, "quest-1"),
                course_id=course_id,
                chapter_id=chapter.id,
                title="Practice retrieval",
                description="Complete your first practice challenge.",
                challenge_ids=[],
            )
        )
        self.db.flush()

    async def retrieve_context(
        self, course_id: UUID, query: str, concept_id: UUID | None = None, top_k: int = 8
    ) -> list[s.RetrievedChunk]:
        statement = scoped_chunks(course_id, concept_id)
        chunks = self.db.scalars(statement.order_by(m.SourceChunk.id)).all()
        words = set(query.lower().split())
        ranked = sorted(
            chunks, key=lambda c: (-len(words.intersection(c.content.lower().split())), str(c.id))
        )
        return [
            s.RetrievedChunk(
                chunk_id=c.id,
                course_id=c.course_id,
                concept_id=concept_id if concept_id is not None else c.concept_id,
                content=c.content,
                score=1.0 / (i + 1),
                source=self.source_reference(c),
            )
            for i, c in enumerate(ranked[: max(0, top_k)])
        ]

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

    async def get_context_by_ids(self, course_id, chunk_ids, concept_id=None):
        return DatabaseChunkStore(self.db).get_by_ids(course_id, chunk_ids, concept_id)

    async def get_course_map(self, course_id: UUID) -> s.CourseMap:
        return course_map(self.db, course_id)
