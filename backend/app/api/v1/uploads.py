from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import owned_course
from app.core.auth import current_user
from app.core.errors import AppError
from app.db.session import get_db
from app.models import domain as m
from app.schemas import domain as s
from app.services.storage.local import LocalStorageService, get_storage

router = APIRouter(tags=["uploads"])


@router.post("/uploads/presign", response_model=s.UploadInfo)
async def presign(
    payload: s.UploadRequest,
    db: Session = Depends(get_db),
    user: m.User = Depends(current_user),
    storage: LocalStorageService = Depends(get_storage),
) -> s.UploadInfo:
    owned_course(db, user, payload.course_id)
    file = m.CourseFile(
        id=uuid4(),
        course_id=payload.course_id,
        filename=payload.filename,
        source_type=payload.source_type.value,
        content_type=payload.content_type,
        size_bytes=payload.size_bytes,
        object_key=f"{user.id}/{payload.course_id}/{uuid4()}",
    )
    db.add(file)
    db.flush()
    info = await storage.generate_upload_info(file.object_key, file.content_type)
    return s.UploadInfo(file_id=file.id, object_key=file.object_key, **info.model_dump())


@router.put("/uploads/local/{object_key:path}", status_code=204)
async def local_upload(
    object_key: str,
    expires: int,
    token: str,
    request: Request,
    db: Session = Depends(get_db),
    storage: LocalStorageService = Depends(get_storage),
) -> Response:
    storage.verify(object_key, expires, token)
    file = db.scalar(
        select(m.CourseFile).where(m.CourseFile.object_key == object_key).with_for_update()
    )
    if file is None:
        raise AppError(404, "FILE_NOT_FOUND", "Upload reservation does not exist.")
    if file.upload_completed:
        raise AppError(409, "INVALID_UPLOAD", "Completed files cannot be overwritten.")
    if request.headers.get("content-type") != file.content_type:
        raise AppError(422, "INVALID_UPLOAD", "Content-Type must match the upload reservation.")
    path = storage.path(object_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.{uuid4()}.tmp")
    size = 0
    try:
        with temporary.open("wb") as target:
            async for chunk in request.stream():
                size += len(chunk)
                if size > file.size_bytes:
                    raise AppError(413, "INVALID_UPLOAD", "Upload exceeds reserved size.")
                target.write(chunk)
        if size != file.size_bytes:
            raise AppError(422, "INVALID_UPLOAD", "Upload size does not match reservation.")
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    return Response(status_code=204)


@router.post("/courses/{course_id}/files/complete", response_model=s.CourseFile)
async def complete(
    course_id: UUID,
    payload: s.UploadComplete,
    db: Session = Depends(get_db),
    user: m.User = Depends(current_user),
    storage: LocalStorageService = Depends(get_storage),
) -> m.CourseFile:
    owned_course(db, user, course_id)
    file = db.scalar(
        select(m.CourseFile)
        .where(m.CourseFile.id == payload.file_id, m.CourseFile.course_id == course_id)
        .with_for_update()
    )
    if file is None:
        raise AppError(404, "FILE_NOT_FOUND", "The requested file does not exist.")
    metadata = await storage.get_object_metadata(file.object_key)
    if metadata is None or metadata.size_bytes != file.size_bytes:
        raise AppError(422, "INVALID_UPLOAD", "Upload the reserved object before completing it.")
    file.upload_completed = True
    db.flush()
    return file
