"""Manual-only endpoint smoke test; never prints credentials or model response contents."""

import asyncio

from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.errors import AppError
from app.services.factories import create_model


class SmokeDraft(BaseModel):
    answer: str = Field(min_length=1)


async def main() -> int:
    if get_settings().model_provider != "openai":
        print("Select MODEL_PROVIDER=openai before running this manual test.")
        return 1
    try:
        model = create_model()
        text = await model.generate([{"role": "user", "content": "Reply with a brief greeting."}])
        print(f"Text request: OK ({len(text)} characters)")
        await model.generate_structured(
            [{"role": "user", "content": "Return a brief greeting in the answer field."}],
            SmokeDraft,
        )
        print("Structured request: OK (schema validated)")
        return 0
    except AppError as exc:
        print(f"{exc.code}: {exc.message}")
        return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
