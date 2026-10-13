from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import domain as m


def get_game_state(db: Session, user_id: UUID, course_id: UUID) -> m.GameState:
    state = db.scalar(
        select(m.GameState)
        .where(m.GameState.user_id == user_id, m.GameState.course_id == course_id)
        .with_for_update()
    )
    if state is None:
        state = m.GameState(
            user_id=user_id,
            course_id=course_id,
            xp=0,
            level=1,
            completed_challenges=[],
            unlocked_chapter_ids=[],
        )
        db.add(state)
        db.flush()
    first = db.scalar(
        select(m.Chapter).where(m.Chapter.course_id == course_id).order_by(m.Chapter.order_index)
    )
    if first is not None and not state.unlocked_chapter_ids:
        state.current_chapter_id = first.id
        state.unlocked_chapter_ids = [str(first.id)]
    return state


def reward_challenge(state: m.GameState, challenge: m.Challenge) -> None:
    if str(challenge.id) not in state.completed_challenges:
        state.completed_challenges = [*state.completed_challenges, str(challenge.id)]
        state.xp += challenge.xp_reward
        state.level = 1 + state.xp // 100
    state.current_concept_id = challenge.concept_id
