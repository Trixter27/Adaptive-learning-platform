from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import domain as m


def owned_course(db: Session, user: m.User, course_id: UUID, lock: bool = False) -> m.Course:
    statement = select(m.Course).where(m.Course.id == course_id, m.Course.user_id == user.id)
    if lock:
        statement = statement.with_for_update()
    course = db.scalar(statement)
    if course is None:
        raise AppError(404, "COURSE_NOT_FOUND", "The requested course does not exist.")
    return course


def owned_concept(
    db: Session, user: m.User, concept_id: UUID, course_id: UUID | None = None
) -> m.Concept:
    statement = (
        select(m.Concept)
        .join(m.Topic)
        .join(m.Chapter)
        .join(m.Course)
        .where(m.Concept.id == concept_id, m.Course.user_id == user.id)
    )
    if course_id is not None:
        statement = statement.where(m.Course.id == course_id)
    concept = db.scalar(statement)
    if concept is None:
        raise AppError(
            404, "CONCEPT_NOT_FOUND", "The requested concept does not exist in this course."
        )
    return concept


def concept_course_id(db: Session, concept_id: UUID) -> UUID:
    return db.scalar(
        select(m.Chapter.course_id).join(m.Topic).join(m.Concept).where(m.Concept.id == concept_id)
    )
