from fastapi import APIRouter, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException

from app.api.v1 import courses, jobs, knowledge, learning, progress, uploads
from app.core.config import get_settings
from app.core.errors import (
    AppError,
    app_error_handler,
    http_error_handler,
    validation_error_handler,
)
from app.schemas.domain import ErrorResponse


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Adaptive Learning Platform", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(HTTPException, http_error_handler)

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok", "version": "0.1.0"}

    api = APIRouter(
        prefix=settings.api_v1_prefix,
        responses={status: {"model": ErrorResponse} for status in [401, 404, 409, 422, 503]},
    )
    for router in (
        courses.router,
        uploads.router,
        jobs.router,
        knowledge.router,
        learning.router,
        progress.router,
    ):
        api.include_router(router)
    app.include_router(api)
    return app


app = create_app()
