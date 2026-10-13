from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services import factories
from app.services.inference.base import ModelProvider
from app.services.knowledge.base import KnowledgeService
from app.services.learning.base import LearningService


def get_knowledge(db: Session = Depends(get_db)) -> KnowledgeService:
    return factories.create_knowledge(db)


def get_learning() -> LearningService:
    return factories.create_learning()


def get_model() -> ModelProvider:
    return factories.create_model()
