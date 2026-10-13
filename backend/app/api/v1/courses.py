from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import owned_course
from app.core.auth import current_user
from app.db.session import get_db
from app.models import domain as m
from app.schemas import domain as s
from app.services.storage.local import LocalStorageService, get_storage

router = APIRouter(tags=["courses"])


@router.post("/courses", response_model=s.Course, status_code=201)
def create_course(
    payload: s.CourseCreate, db: Session = Depends(get_db), user: m.User = Depends(current_user)
) -> m.Course:
    course = m.Course(user_id=user.id, **payload.model_dump())
    db.add(course)
    db.flush()
    return course


@router.get("/courses", response_model=list[s.Course])
def list_courses(
    db: Session = Depends(get_db), user: m.User = Depends(current_user)
) -> list[m.Course]:
    return list(
        db.scalars(
            select(m.Course).where(m.Course.user_id == user.id).order_by(m.Course.created_at)
        )
    )


@router.get("/courses/{course_id}", response_model=s.Course)
def get_course(
    course_id: UUID, db: Session = Depends(get_db), user: m.User = Depends(current_user)
) -> m.Course:
    return owned_course(db, user, course_id)


@router.delete("/courses/{course_id}", status_code=204)
async def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    user: m.User = Depends(current_user),
    storage: LocalStorageService = Depends(get_storage),
) -> Response:
    course = owned_course(db, user, course_id, lock=True)
    files = db.scalars(select(m.CourseFile).where(m.CourseFile.course_id == course_id)).all()
    for file in files:
        await storage.delete_object(file.object_key)
    db.delete(course)
    db.flush()
    return Response(status_code=204)
