"""Framework-independent adapter selection for both API dependencies and workers."""

from sqlalchemy.orm import Session

from app.services.inference.base import ModelProvider
from app.services.inference.mock import MockModelProvider
from app.services.knowledge.base import KnowledgeService
from app.services.knowledge.mock import MockKnowledgeService
from app.services.learning.base import LearningService
from app.services.learning.mock import MockLearningService


def create_knowledge(db: Session) -> KnowledgeService:
    return MockKnowledgeService(db)


def create_learning() -> LearningService:
    return MockLearningService()


def create_model() -> ModelProvider:
    return MockModelProvider()
