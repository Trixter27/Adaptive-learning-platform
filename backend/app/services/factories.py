"""Framework-independent adapter selection for both API dependencies and workers."""

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.services.inference.base import ModelProvider
from app.services.inference.mock import MockModelProvider
from app.services.inference.unavailable import UnavailableModelProvider
from app.services.knowledge.base import KnowledgeService
from app.services.knowledge.mock import MockKnowledgeService
from app.services.learning.adaptive import AdaptiveLearningService
from app.services.learning.base import LearningService
from app.services.learning.mock import MockLearningService


def create_knowledge(db: Session) -> KnowledgeService:
    return MockKnowledgeService(db)


def create_learning(db: Session, model: ModelProvider | None = None) -> LearningService:
    settings = get_settings()
    if settings.learning_mode == "mock":
        if settings.environment not in {"development", "test"}:
            raise AppError(
                503, "MODEL_UNAVAILABLE", "Mock learning is only available in development/test."
            )
        return MockLearningService()
    return AdaptiveLearningService(
        db, model if model is not None else create_model(), settings.learning
    )


def create_model() -> ModelProvider:
    if get_settings().environment in {"development", "test"}:
        return MockModelProvider()
    return UnavailableModelProvider()
