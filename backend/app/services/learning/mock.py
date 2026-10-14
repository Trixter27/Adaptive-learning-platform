from typing import Any

from app.core.errors import AppError
from app.db.base import utc_now
from app.models.domain import Challenge, Concept
from app.schemas.domain import AssessmentResult, MasteryState, NextAction, RetrievedChunk


class MockLearningService:
    initial_mastery = 0.0

    async def generate_challenge(
        self, concept: Concept, source_context: list[RetrievedChunk], mastery_state: MasteryState
    ) -> Challenge:
        return Challenge(
            concept_id=concept.id,
            mode="mcq",
            title=f"Practice: {concept.name}",
            prompt=f"Which statement best describes {concept.name.lower()}?",
            difficulty=concept.difficulty,
            xp_reward=20,
            content={
                "options": [
                    concept.description,
                    "Reread the same notes without testing memory.",
                    "Avoid practice until the final exam.",
                    "Practice only once.",
                ]
            },
            source_chunk_ids=[str(c.chunk_id) for c in source_context],
            answer_key={"selected_option": 0},
        )

    async def evaluate_answer(
        self,
        challenge: Challenge,
        student_answer: dict[str, Any],
        source_context: list[RetrievedChunk],
    ) -> AssessmentResult:
        if challenge.mode != "mcq":
            raise AppError(
                422, "INVALID_CHALLENGE", "The mock evaluator supports MCQ challenges only."
            )
        option = student_answer.get("selected_option")
        if type(option) is not int or not 0 <= option < len(challenge.content["options"]):
            raise AppError(
                422, "INVALID_CHALLENGE", "selected_option must be a valid zero-based option index."
            )
        correct = option == challenge.answer_key["selected_option"]
        return AssessmentResult(
            correct=correct,
            score=1.0 if correct else 0.0,
            feedback="Correct! Keep practicing retrieval."
            if correct
            else "Review the concept and try retrieving it from memory.",
            misconception=None if correct else "Confusing passive review with effective retrieval.",
            mastery_before=0,
            mastery_after=0,
            next_action=NextAction.continue_,
        )

    async def update_mastery(
        self, current_mastery: MasteryState, assessment: AssessmentResult
    ) -> MasteryState:
        score = round(
            min(1.0, current_mastery.mastery_score + 0.2)
            if assessment.correct
            else max(0.0, current_mastery.mastery_score - 0.1),
            4,
        )
        return current_mastery.model_copy(
            update={
                "mastery_score": score,
                "attempt_count": current_mastery.attempt_count + 1,
                "correct_count": current_mastery.correct_count + int(assessment.correct),
                "last_updated": utc_now(),
            }
        )

    async def recommend_next_action(self, mastery_state: MasteryState) -> NextAction:
        if mastery_state.mastery_score >= 0.8:
            return NextAction.advance
        if mastery_state.attempt_count and mastery_state.mastery_score < 0.2:
            return NextAction.remediate
        return NextAction.continue_
