from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import owned_course
from app.core.auth import current_user
from app.core.errors import AppError
from app.db.session import get_db
from app.models import domain as m
from app.schemas import domain as s

router = APIRouter(tags=["processing"])


@router.post("/courses/{course_id}/process", response_model=s.ProcessingJob, status_code=202)
def process(
    course_id: UUID,
    payload: s.ProcessRequest | None = None,
    db: Session = Depends(get_db),
    user: m.User = Depends(current_user),
) -> m.ProcessingJob:
    payload = payload or s.ProcessRequest()
    owned_course(db, user, course_id, lock=True)
    if payload.file_id is not None:
        file = db.get(m.CourseFile, payload.file_id)
        if file is None or file.course_id != course_id or not file.upload_completed:
            raise AppError(
                422,
                "INVALID_UPLOAD",
                "Processing requires a completed file belonging to this course.",
            )
    active = db.scalar(
        select(m.ProcessingJob).where(
            m.ProcessingJob.course_id == course_id,
            m.ProcessingJob.status.in_(["pending", "processing"]),
        )
    )
    if active is not None:
        return active
    job = m.ProcessingJob(course_id=course_id, file_id=payload.file_id)
    db.add(job)
    db.flush()
    return job


@router.get("/jobs/{job_id}", response_model=s.ProcessingJob)
def get_job(
    job_id: UUID, db: Session = Depends(get_db), user: m.User = Depends(current_user)
) -> m.ProcessingJob:
    job = db.scalar(
        select(m.ProcessingJob)
        .join(m.Course)
        .where(m.ProcessingJob.id == job_id, m.Course.user_id == user.id)
    )
    if job is None:
        raise AppError(404, "JOB_NOT_FOUND", "The requested job does not exist.")
    return job
