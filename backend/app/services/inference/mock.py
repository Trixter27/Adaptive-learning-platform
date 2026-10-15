import json
from typing import Any

from app.core.errors import AppError
from app.services.inference.base import T
from app.services.inference.schemas import (
    AssessmentDraft,
    ChallengeDraft,
    QuestionVerificationDraft,
    TutorDraft,
)
from app.services.knowledge.schemas import CourseDraft
from app.services.learning.policy import normalize_prompt


class MockModelProvider:
    """No networking. Structured output supports explicit fixtures rather than inventing fields."""

    async def generate(self, messages: list[dict[str, str]]) -> str:
        return "Mock tutor: practice retrieving the idea from memory, then check your notes."

    async def generate_structured(self, messages: list[dict[str, str]], schema: type[T]) -> T:
        if schema is CourseDraft:
            payload = json.loads(messages[-1]["content"])
            return schema.model_validate(
                {
                    "chapters": [
                        {
                            "title": f"{payload['title'][:150]} (mock outline)",
                            "topics": [
                                {
                                    "title": f"Source sections {start + 1}-{min(start + 20, len(payload['sources']))} (mock)",
                                    "concepts": [
                                        {
                                            "name": f"Source section {source['number']} (mock)",
                                            "description": source["content"],
                                            "source_numbers": [source["number"]],
                                        }
                                        for source in payload["sources"][start : start + 20]
                                    ],
                                }
                                for start in range(0, len(payload["sources"]), 20)
                            ],
                        }
                    ]
                }
            )
        if schema is TutorDraft:
            context = [m["content"] for m in messages if m["role"] == "context"]
            return schema.model_validate(
                {
                    "answer": context[0] if context else await self.generate(messages),
                    "source_chunk_ids": [m["content"] for m in messages if m["role"] == "chunk_id"],
                }
            )
        if schema in (ChallengeDraft, QuestionVerificationDraft, AssessmentDraft):
            payload = json.loads(messages[-1]["content"])
            context = payload["context"]
            ids = [c["chunk_id"] for c in context]
            if schema is ChallengeDraft:
                name = payload["concept"]["name"]
                variants = [
                    f"Which statement about {name} is supported by the supplied source?",
                    f"Select the source-backed explanation of {name}.",
                    f"Which description of {name} agrees with the evidence?",
                ]
                excluded = {normalize_prompt(p) for p in payload["excluded_prompts"]}
                prompt = next(
                    (p for p in variants if normalize_prompt(p) not in excluded), variants[0]
                )
                evidence = context[0]["content"]
                return schema.model_validate(
                    {
                        "concept_id": payload["concept"]["id"],
                        "mode": "mcq",
                        "title": f"Practice: {name}",
                        "prompt": prompt,
                        "difficulty": payload["difficulty"],
                        "content": {
                            "options": [
                                evidence,
                                f"The opposite is true: {evidence}",
                                "The source gives no information about this concept.",
                                "None of these statements is supported by the source.",
                            ]
                        },
                        "answer_key": {"selected_option": 0},
                        "source_chunk_ids": [ids[0]],
                    }
                )
            if schema is QuestionVerificationDraft:
                # Fixture validation, NOT semantic verification of arbitrary real questions.
                draft = payload["challenge"]
                supported = draft["mode"] == "mcq" and draft["content"]["options"][
                    draft["answer_key"]["selected_option"]
                ] in [c["content"] for c in context]
                return schema.model_validate(
                    {
                        "concept_id": payload["concept_id"],
                        "concept_relevant": supported,
                        "answerable": supported,
                        "answer_supported": supported,
                        "consistent": supported,
                        "unique_correct_answer": supported,
                        "numerical_usable": False,
                        "source_chunk_ids": ids,
                        "issues": []
                        if supported
                        else ["No semantic verifier fixture for this question"],
                    }
                )
            correct = normalize_prompt(payload["student_answer"]) == normalize_prompt(
                payload["expected_answer"]
            )
            return schema.model_validate(
                {
                    "correct": correct,
                    "score": float(correct),
                    "feedback": (
                        "Matches the expected explanation. "
                        if correct
                        else "Review the expected explanation. "
                    )
                    + "Supporting evidence: "
                    + context[0]["content"],
                    "misconception": None,
                    "source_chunk_ids": ids,
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
