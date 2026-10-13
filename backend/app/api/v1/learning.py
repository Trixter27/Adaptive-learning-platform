from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import concept_course_id, owned_concept, owned_course
from app.core.auth import current_user
from app.core.errors import AppError
from app.db.session import get_db
from app.models import domain as m
from app.schemas import domain as s
from app.services.dependencies import get_knowledge, get_learning
from app.services.game.state import get_game_state, reward_challenge
from app.services.knowledge.base import KnowledgeService
from app.services.learning.base import LearningService

router = APIRouter(tags=["learning"])


def get_mastery(db: Session, user_id: UUID, concept_id: UUID) -> m.MasteryState:
    state = db.scalar(
        select(m.MasteryState)
        .where(m.MasteryState.user_id == user_id, m.MasteryState.concept_id == concept_id)
        .with_for_update()
    )
    if state is None:
        state = m.MasteryState(user_id=user_id, concept_id=concept_id)
        db.add(state)
        db.flush()
    return state


@router.post("/challenges/next", response_model=s.Challenge, status_code=201)
async def next_challenge(
    payload: s.NextChallengeRequest,
    db: Session = Depends(get_db),
    user: m.User = Depends(current_user),
    knowledge: KnowledgeService = Depends(get_knowledge),
    learning: LearningService = Depends(get_learning),
) -> m.Challenge:
    owned_course(db, user, payload.course_id, lock=True)
    if payload.concept_id:
        concept = owned_concept(db, user, payload.concept_id, payload.course_id)
    else:
        concept = db.scalar(
            select(m.Concept)
            .join(m.Topic)
            .join(m.Chapter)
            .where(m.Chapter.course_id == payload.course_id)
            .order_by(
                m.Chapter.order_index, m.Topic.order_index, m.Concept.difficulty, m.Concept.id
            )
        )
    if concept is None:
        raise AppError(
            409, "INVALID_CHALLENGE", "Process the course before requesting a challenge."
        )
    mastery = get_mastery(db, user.id, concept.id)
    context = await knowledge.retrieve_context(payload.course_id, concept.name, concept.id)
    challenge = await learning.generate_challenge(
        concept, context, s.MasteryState.model_validate(mastery)
    )
    db.add(challenge)
    db.flush()
    return challenge


@router.post("/attempts", response_model=s.AssessmentResult)
async def submit_attempt(
    payload: s.AttemptRequest,
    db: Session = Depends(get_db),
    user: m.User = Depends(current_user),
    knowledge: KnowledgeService = Depends(get_knowledge),
    learning: LearningService = Depends(get_learning),
) -> s.AssessmentResult:
    challenge = db.get(m.Challenge, payload.challenge_id)
    if challenge is None:
        raise AppError(404, "INVALID_CHALLENGE", "The requested challenge does not exist.")
    owned_concept(db, user, challenge.concept_id)
    course_id = concept_course_id(db, challenge.concept_id)
    owned_course(db, user, course_id, lock=True)
    state = get_mastery(db, user.id, challenge.concept_id)
    context = await knowledge.retrieve_context(course_id, challenge.prompt, challenge.concept_id)
    assessment = await learning.evaluate_answer(challenge, payload.answer, context)
    updated = await learning.update_mastery(s.MasteryState.model_validate(state), assessment)
    assessment.mastery_before, assessment.mastery_after = state.mastery_score, updated.mastery_score
    assessment.next_action = await learning.recommend_next_action(updated)
    for name in ("mastery_score", "attempt_count", "correct_count", "last_updated"):
        setattr(state, name, getattr(updated, name))
    db.add(
        m.Attempt(
            user_id=user.id,
            challenge_id=challenge.id,
            answer=payload.answer,
            time_taken_seconds=payload.time_taken_seconds,
            assessment=assessment.model_dump(mode="json"),
        )
    )
    game = get_game_state(db, user.id, course_id)
    if assessment.correct:
        reward_challenge(game, challenge)
    db.flush()
    return assessment
