from typing import Any, Protocol

from app.models.domain import Challenge, Concept
from app.schemas.domain import AssessmentResult, MasteryState, NextAction, RetrievedChunk


class LearningService(Protocol):
    async def generate_challenge(
        self, concept: Concept, source_context: list[RetrievedChunk], mastery_state: MasteryState
    ) -> Challenge: ...
    async def evaluate_answer(
        self,
        challenge: Challenge,
        student_answer: dict[str, Any],
        source_context: list[RetrievedChunk],
    ) -> AssessmentResult: ...
    async def update_mastery(
        self, current_mastery: MasteryState, assessment: AssessmentResult
    ) -> MasteryState: ...
    async def recommend_next_action(self, mastery_state: MasteryState) -> NextAction: ...
