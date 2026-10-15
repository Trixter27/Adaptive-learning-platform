"""Fail closed until a real model adapter is selected in the service factory."""

from typing import Any

from app.core.errors import AppError
from app.services.inference.base import T


class UnavailableModelProvider:
    async def generate(self, messages: list[dict[str, str]]) -> str:
        raise AppError(503, "MODEL_UNAVAILABLE", "No production model provider is configured.")

    async def generate_structured(self, messages: list[dict[str, str]], schema: type[T]) -> T:
        raise AppError(503, "MODEL_UNAVAILABLE", "No production model provider is configured.")

    async def analyze_media(
        self, media: bytes, prompt: str, schema: type[T] | None = None
    ) -> T | dict[str, Any]:
        raise AppError(503, "MODEL_UNAVAILABLE", "No production model provider is configured.")
