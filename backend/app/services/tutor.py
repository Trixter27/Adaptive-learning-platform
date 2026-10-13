from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import domain as m
from app.schemas import domain as s
from app.services.inference.base import ModelProvider
from app.services.inference.schemas import TutorDraft
from app.services.knowledge.base import KnowledgeService


async def chat(
    db: Session,
    user_id: UUID,
    request: s.TutorRequest,
    knowledge: KnowledgeService,
    model: ModelProvider,
) -> s.TutorResponse:
    chunks = await knowledge.retrieve_context(
        request.course_id, request.message, request.concept_id
    )
    messages = [{"role": "user", "content": request.message}]
    for chunk in chunks:
        messages.extend(
            [
                {"role": "context", "content": chunk.content},
                {"role": "chunk_id", "content": str(chunk.chunk_id)},
            ]
        )
    draft = await model.generate_structured(messages, TutorDraft)
    # Only resolve retrieved IDs scoped to this course; no provider-supplied source metadata.
    retrieved_ids = {str(c.chunk_id) for c in chunks}
    ids = []
    for value in draft.source_chunk_ids:
        if value in retrieved_ids and UUID(value) not in ids:
            ids.append(UUID(value))
    sources = []
    for chunk in db.scalars(
        select(m.SourceChunk).where(
            m.SourceChunk.course_id == request.course_id, m.SourceChunk.id.in_(ids)
        )
    ).all():
        file = db.get(m.CourseFile, chunk.file_id)
        sources.append(
            s.SourceReference(
                file_id=file.id,
                source_type=file.source_type,
                page_number=chunk.page_number,
                slide_number=chunk.slide_number,
                start_seconds=chunk.start_seconds,
                end_seconds=chunk.end_seconds,
            )
        )
    answer_type = s.AnswerType.source_backed if sources else s.AnswerType.general_knowledge
    conversation = m.TutorConversation(user_id=user_id, course_id=request.course_id)
    db.add(conversation)
    db.flush()
    db.add_all(
        [
            m.TutorMessage(conversation_id=conversation.id, role="user", content=request.message),
            m.TutorMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=draft.answer,
                answer_type=answer_type.value,
                source_chunk_ids=[str(i) for i in ids],
            ),
        ]
    )
    return s.TutorResponse(answer=draft.answer, answer_type=answer_type, sources=sources)
