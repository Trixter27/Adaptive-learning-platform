"""Embedding capability, independent of text generation and database storage."""

import hashlib
import math
import re
from typing import Protocol

import httpx

from app.core.errors import AppError

DIMENSION = 1024
QUERY_INSTRUCTION = "Given a student's question, retrieve the course passages that answer it"


class EmbeddingProvider(Protocol):
    async def embed_texts(self, texts: list[str]) -> list[list[float]]: ...
    async def embed_query(self, text: str) -> list[float]: ...


def normalize(vector: list[float]) -> list[float]:
    if len(vector) != DIMENSION or not all(math.isfinite(v) for v in vector):
        raise ValueError("Embeddings must contain 1024 finite numbers.")
    norm = math.sqrt(sum(v * v for v in vector))
    if not norm or not math.isfinite(norm):
        raise ValueError("Embedding must have a finite nonzero norm.")
    return [v / norm for v in vector]


class MockEmbeddingProvider:
    """Stable lexical hashing for offline tests; not a semantic model."""

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        result = []
        for text in texts:
            vector = [0.0] * DIMENSION
            for word in re.findall(r"\w+", text.casefold()) or [""]:
                index = int.from_bytes(hashlib.sha256(word.encode()).digest()[:4]) % DIMENSION
                vector[index] += 1
            result.append(normalize(vector))
        return result

    async def embed_query(self, text: str) -> list[float]:
        return (await self.embed_texts([text]))[0]


class OpenAIEmbeddingProvider:
    """Qwen-compatible batching, query instruction, dimension checks and normalization."""

    def __init__(self, base_url: str, api_key: str, model: str):
        self.base_url, self.api_key, self.model = base_url, api_key, model

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if not self.base_url or not self.model:
            raise AppError(
                503, "EMBEDDING_UNAVAILABLE", "Configure the embedding endpoint and model."
            )
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            result = []
            async with httpx.AsyncClient(timeout=60, headers=headers) as client:
                for start in range(0, len(texts), 16):
                    batch = texts[start : start + 16]
                    response = await client.post(
                        f"{self.base_url.rstrip('/')}/embeddings",
                        json={"model": self.model, "input": batch, "encoding_format": "float"},
                    )
                    response.raise_for_status()
                    rows = sorted(response.json()["data"], key=lambda row: row["index"])
                    if [r["index"] for r in rows] != list(range(len(batch))):
                        raise ValueError("Missing or duplicate embedding rows.")
                    result.extend(normalize([float(v) for v in r["embedding"]]) for r in rows)
            return result
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
            raise AppError(
                503, "EMBEDDING_UNAVAILABLE", "Embedding request failed validation."
            ) from exc

    async def embed_query(self, text: str) -> list[float]:
        return (await self.embed_texts([f"Instruct: {QUERY_INSTRUCTION}\nQuery: {text}"]))[0]
