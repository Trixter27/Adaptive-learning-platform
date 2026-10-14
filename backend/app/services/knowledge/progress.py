"""Task-local progress observer; no framework or concrete service dependency."""

from collections.abc import Callable
from contextvars import ContextVar

observer: ContextVar[Callable[[str, int], None] | None] = ContextVar(
    "knowledge_progress", default=None
)


def report(stage: str, progress: int) -> None:
    callback = observer.get()
    if callback is not None:
        callback(stage, progress)
