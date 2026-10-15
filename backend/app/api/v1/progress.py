from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import owned_course
from app.core.auth import current_user
from app.db.session import get_db
from app.models import domain as m
from app.schemas import domain as s
from app.services.game.state import get_game_state

router = APIRouter(tags=["progress"])


@router.get("/courses/{course_id}/progress", response_model=s.ProgressResponse)
def progress(
    course_id: UUID, db: Session = Depends(get_db), user: m.User = Depends(current_user)
) -> s.ProgressResponse:
    owned_course(db, user, course_id)
    concepts = list(
        db.scalars(
            select(m.Concept.id)
            .join(m.Topic)
            .join(m.Chapter)
            .where(m.Chapter.course_id == course_id)
        )
    )
    states = db.scalars(
        select(m.MasteryState).where(
            m.MasteryState.user_id == user.id, m.MasteryState.concept_id.in_(concepts)
        )
    ).all()
    return s.ProgressResponse(
        course_id=course_id,
        mastery=[s.MasteryState.model_validate(m) for m in states],
        average_mastery=sum(m.mastery_score for m in states) / len(concepts) if concepts else 0,
    )


@router.get("/courses/{course_id}/game", response_model=s.GameState)
def game(
    course_id: UUID, db: Session = Depends(get_db), user: m.User = Depends(current_user)
) -> m.GameState:
    owned_course(db, user, course_id, lock=True)
    return get_game_state(db, user.id, course_id)
