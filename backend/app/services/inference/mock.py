from typing import Any

from app.core.errors import AppError
from app.services.inference.base import T
from app.services.inference.schemas import TutorDraft


class MockModelProvider:
    """No networking. Structured output supports explicit fixtures rather than inventing fields."""

    async def generate(self, messages: list[dict[str, str]]) -> str:
        return "Mock tutor: practice retrieving the idea from memory, then check your notes."

    async def generate_structured(self, messages: list[dict[str, str]], schema: type[T]) -> T:
        if schema is TutorDraft:
            context = [m["content"] for m in messages if m["role"] == "context"]
            return schema.model_validate(
                {
                    "answer": context[0] if context else await self.generate(messages),
                    "source_chunk_ids": [m["content"] for m in messages if m["role"] == "chunk_id"],
                }
            )
        raise AppError(
            503, "MODEL_UNAVAILABLE", "No mock fixture is registered for this output schema."
        )

    async def analyze_media(
        self, media: bytes, prompt: str, schema: type[T] | None = None
    ) -> T | dict[str, Any]:
        if schema is not None:
            return await self.generate_structured([{"role": "user", "content": prompt}], schema)
        return {"mock": True, "description": "Media analysis is not implemented in v0.1."}
