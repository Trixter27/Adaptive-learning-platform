from typing import Any, Protocol, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class ModelProvider(Protocol):
    async def generate(self, messages: list[dict[str, str]]) -> str: ...
    async def generate_structured(self, messages: list[dict[str, str]], schema: type[T]) -> T: ...
    async def analyze_media(
        self, media: bytes, prompt: str, schema: type[T] | None = None
    ) -> T | dict[str, Any]: ...
