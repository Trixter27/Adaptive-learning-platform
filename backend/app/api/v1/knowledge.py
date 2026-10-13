from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import owned_concept, owned_course
from app.core.auth import current_user
from app.db.session import get_db
from app.models import domain as m
from app.schemas import domain as s
from app.services.dependencies import get_knowledge, get_model
from app.services.inference.base import ModelProvider
from app.services.knowledge.base import KnowledgeService
from app.services.tutor import chat

router = APIRouter(tags=["knowledge", "tutor"])


@router.get("/courses/{course_id}/map", response_model=s.CourseMap)
async def course_map(
    course_id: UUID,
    db: Session = Depends(get_db),
    user: m.User = Depends(current_user),
    knowledge: KnowledgeService = Depends(get_knowledge),
) -> s.CourseMap:
    owned_course(db, user, course_id)
    return await knowledge.get_course_map(course_id)


@router.get("/concepts/{concept_id}", response_model=s.Concept)
def get_concept(
    concept_id: UUID, db: Session = Depends(get_db), user: m.User = Depends(current_user)
) -> m.Concept:
    return owned_concept(db, user, concept_id)


@router.post("/tutor/chat", response_model=s.TutorResponse)
async def tutor(
    payload: s.TutorRequest,
    db: Session = Depends(get_db),
    user: m.User = Depends(current_user),
    knowledge: KnowledgeService = Depends(get_knowledge),
    model: ModelProvider = Depends(get_model),
) -> s.TutorResponse:
    owned_course(db, user, payload.course_id)
    if payload.concept_id:
        owned_concept(db, user, payload.concept_id, payload.course_id)
    return await chat(db, user.id, payload, knowledge, model)
