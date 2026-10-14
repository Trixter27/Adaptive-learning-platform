from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services import factories
from app.services.inference.base import ModelProvider
from app.services.knowledge.base import KnowledgeService
from app.services.learning.base import LearningService


def get_knowledge(db: Session = Depends(get_db)) -> KnowledgeService:
    return factories.create_knowledge(db)


def get_model() -> ModelProvider:
    return factories.create_model()


def get_learning(
    db: Session = Depends(get_db), model: ModelProvider = Depends(get_model)
) -> LearningService:
    return factories.create_learning(db, model)
