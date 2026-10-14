from functools import lru_cache
from pathlib import Path
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.services.learning.policy import LearningPolicy


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        extra="ignore",
        env_nested_delimiter="__",
    )

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/adaptive_learning"
    environment: str = "development"
    auth_mode: Literal["development", "clerk"] = "development"
    dev_user_id: UUID = UUID("00000000-0000-4000-8000-000000000001")
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000"]
    local_storage_path: Path = Path(__file__).resolve().parents[2] / ".local-storage"
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    clerk_jwks_url: str = ""
    storage_endpoint: str = ""
    storage_bucket: str = ""
    storage_access_key: str = ""
    storage_secret_key: str = ""
    model_base_url: str = ""
    model_api_key: str = ""
    model_name: str = ""
    knowledge_provider: Literal["mock", "questoriaa"] = "mock"
    embedding_provider: Literal["mock", "openai"] = "openai"
    embedding_base_url: str = ""
    embedding_api_key: str = ""
    embedding_model: str = "Qwen/Qwen3-Embedding-0.6B"
    embedding_dimension: Literal[1024] = 1024
    learning_mode: Literal["adaptive", "mock"] = "adaptive"
    learning: LearningPolicy = Field(default_factory=LearningPolicy)

    @model_validator(mode="after")
    def safe_auth(self) -> "Settings":
        if self.auth_mode == "development" and self.environment not in {"development", "test"}:
            raise ValueError("Development authentication is only allowed in development/test.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
