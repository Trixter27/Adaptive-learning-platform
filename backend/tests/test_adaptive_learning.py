import asyncio
import json
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select

from app.core.config import Settings
from app.core.errors import AppError
from app.models import domain as m
from app.services import factories
from app.services.dependencies import get_knowledge, get_model
from app.services.inference.mock import MockModelProvider
from app.services.inference.schemas import (
    AssessmentDraft,
    ChallengeDraft,
    QuestionVerificationDraft,
)
from app.services.inference.unavailable import UnavailableModelProvider
from app.services.knowledge.mock import MockKnowledgeService
from app.services.learning.adaptive import AdaptiveLearningService
from app.services.learning.mock import MockLearningService
from app.services.learning.policy import LearningPolicy, bkt_update


@pytest.fixture(autouse=True)
def default_learning_settings(monkeypatch):
    # Isolate learner policy from any developer .env overrides.
    settings = Settings(
        _env_file=None,
        environment="test",
        auth_mode="development",
        learning_mode="adaptive",
        learning=LearningPolicy(),
    )
    monkeypatch.setattr(factories, "get_settings", lambda: settings)


@pytest.fixture
def learning_course(processed_course, client, factory):
    course_id = processed_course["id"]
    concept = client.get(f"/api/v1/courses/{course_id}/map").json()["chapters"][0]["topics"][0][
        "concepts"
    ][0]
    with factory() as db:
        row = db.get(m.Concept, UUID(concept["id"]))
        row.name = "Sample measurement"
        row.description = "Measure a sample and record the result."
        row.difficulty = 1
        chunk = db.scalar(select(m.SourceChunk).where(m.SourceChunk.concept_id == row.id))
        chunk.content = (
            "A sample contains 10 units. Collect the sample, then measure it, then record the result. "
            "Alpha labels the first sample and beta labels the second sample."
        )
        file = db.get(m.CourseFile, chunk.file_id)
        file.source_type = "pdf"
        chunk.page_number = 7
        db.commit()
        return {
            "course_id": course_id,
            "concept_id": str(row.id),
            "chunk_id": str(chunk.id),
            "file_id": str(file.id),
        }


class ScriptedModel(MockModelProvider):
    """Explicit fixtures exercise all service modes without an external endpoint."""

    def __init__(self, mode="mcq", draft_hook=None, verification_hook=None, grade_hook=None):
        self.mode = mode
        self.draft_hook = draft_hook
        self.verification_hook = verification_hook
        self.grade_hook = grade_hook
        self.calls = []
        self.generated = 0

    async def generate_structured(self, messages, schema):
        payload = json.loads(messages[-1]["content"])
        self.calls.append((schema, payload))
        if schema is ChallengeDraft:
            self.generated += 1
            questions = {
                "mcq": (
                    "How many units are in the sample?",
                    {"options": ["10", "100", "1"]},
                    {"selected_option": 0},
                ),
                "numerical": (
                    "What is the measured sample quantity?",
                    {"unit": "units"},
                    {"value": 10, "tolerance": 0.1},
                ),
                "short_answer": (
                    "State the sample quantity.",
                    {},
                    {"expected_answer": "A sample contains 10 units."},
                ),
                "matching": (
                    "Match each label to its sample.",
                    {"left": ["alpha", "beta"], "right": ["second", "first"]},
                    {"matches": [1, 0]},
                ),
                "sequence": (
                    "Order the sample workflow.",
                    {"items": ["record", "collect", "measure"]},
                    {"order": [1, 2, 0]},
                ),
            }
            prompt, content, key = questions[self.mode]
            draft = {
                "concept_id": payload["concept"]["id"],
                "mode": self.mode,
                "title": "Measure a sample",
                "prompt": prompt,
                "difficulty": payload["difficulty"],
                "content": content,
                "answer_key": key,
                "source_chunk_ids": [payload["context"][0]["chunk_id"]],
            }
            if self.draft_hook:
                self.draft_hook(payload, draft, self.generated)
            return schema.model_validate(draft)
        if schema is QuestionVerificationDraft:
            data = {
                "concept_id": payload["concept_id"],
                "concept_relevant": True,
                "answerable": True,
                "answer_supported": True,
                "consistent": True,
                "unique_correct_answer": True,
                "numerical_usable": True,
                "source_chunk_ids": payload["challenge"]["source_chunk_ids"],
                "issues": [],
            }
            if self.verification_hook:
                self.verification_hook(data, self.generated)
            return schema.model_validate(data)
        if schema is AssessmentDraft:
            correct = payload["student_answer"] == payload["expected_answer"]
            data = {
                "correct": correct,
                "score": 1.0 if correct else 0.2,
                "feedback": "The source states that the sample contains 10 units.",
                "misconception": None
                if correct
                else "Confuses the quantity with a tenfold larger quantity.",
                "source_chunk_ids": [payload["context"][0]["chunk_id"]],
            }
            if self.grade_hook:
                self.grade_hook(data)
            return schema.model_validate(data)
        return await super().generate_structured(messages, schema)


def generate(client, course):
    return client.post(
        "/api/v1/challenges/next", json={k: course[k] for k in ["course_id", "concept_id"]}
    )


def submit(client, challenge, answer):
    return client.post(
        "/api/v1/attempts",
        json={"challenge_id": challenge["id"], "answer": answer, "time_taken_seconds": 12},
    )


def use_model(client, model):
    client.app.dependency_overrides[get_model] = lambda: model


def distinct_practice_prompt(payload, draft, count):
    """Provide new fixture prompts when testing successive BKT observations."""
    if count == 2:
        draft["prompt"] = "Using the supplied evidence, " + draft["prompt"]
    elif count == 3:
        draft["prompt"] = "From the recorded sample results, " + draft["prompt"]


@pytest.mark.parametrize(
    "mode,answer",
    [
        ("mcq", {"selected_option": 0}),
        ("numerical", {"value": 10.1}),
        ("short_answer", {"text": "A sample contains 10 units."}),
        ("matching", {"matches": [1, 0]}),
        ("sequence", {"order": [1, 2, 0]}),
    ],
)
def test_grounded_generation_grading_and_persisted_game_flow(
    client, learning_course, factory, mode, answer
):
    model = ScriptedModel(mode, draft_hook=distinct_practice_prompt)
    use_model(client, model)
    response = generate(client, learning_course)
    assert response.status_code == 201, response.text
    challenge = response.json()
    assert challenge["mode"] == mode and challenge["difficulty"] == 1
    assert challenge["source_chunk_ids"] == [learning_course["chunk_id"]]
    assert "answer_key" not in challenge and "answer_key" not in challenge["content"]
    assert len(model.calls) == 2
    assert model.calls[0][1]["mastery"]["mastery_score"] == 0.2
    assert model.calls[1][0] is QuestionVerificationDraft
    response = submit(client, challenge, answer)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["correct"] and result["misconception"] is None
    assert result["mastery_before"] == 0.2 and result["mastery_after"] == pytest.approx(0.6)
    assert result["sources"][0]["page_number"] == 7
    assert result["sources"][0]["file_id"] == learning_course["file_id"]
    assert len(model.calls) == (3 if mode == "short_answer" else 2)
    progress = client.get(f"/api/v1/courses/{learning_course['course_id']}/progress").json()
    assert progress["mastery"][0]["mastery_score"] == pytest.approx(0.6)
    assert progress["mastery"][0]["attempt_count"] == progress["mastery"][0]["correct_count"] == 1
    game = client.get(f"/api/v1/courses/{learning_course['course_id']}/game").json()
    assert game["xp"] == 20 and game["completed_challenges"] == [challenge["id"]]
    calls_before = len(model.calls)
    for repeated_answer in [answer, {}]:
        repeated = submit(client, challenge, repeated_answer)
        assert repeated.status_code == 409
        assert repeated.json()["error"] == {
            "code": "INVALID_CHALLENGE",
            "message": "This challenge has already been attempted. Request a new challenge.",
            "details": {},
        }
    assert len(model.calls) == calls_before  # Rejected before model grading.
    assert client.get(f"/api/v1/courses/{learning_course['course_id']}/progress").json() == progress
    assert client.get(f"/api/v1/courses/{learning_course['course_id']}/game").json() == game
    second = generate(client, learning_course)
    assert second.status_code == 201, second.text
    assert second.json()["id"] != challenge["id"]
    assert submit(client, second.json(), answer).json()["next_action"] == "advance"
    assert client.get(f"/api/v1/courses/{learning_course['course_id']}/game").json()["xp"] == 40
    with factory() as db:
        attempts = db.scalars(select(m.Attempt).order_by(m.Attempt.created_at)).all()
        assert len(attempts) == 2 and attempts[-1].assessment["next_action"] == "advance"
        assert attempts[0].assessment["sources"][0]["page_number"] == 7


@pytest.mark.parametrize(
    "mode,answer",
    [
        ("mcq", {"selected_option": 1}),
        ("numerical", {"value": 10.10001}),
        ("short_answer", {"text": "A sample contains 100 units."}),
        ("matching", {"matches": [0, 1]}),
        ("sequence", {"order": [0, 1, 2]}),
    ],
)
def test_wrong_answers_remediate_then_review_without_xp(
    client, learning_course, factory, mode, answer
):
    use_model(client, ScriptedModel(mode, draft_hook=distinct_practice_prompt))
    challenge = generate(client, learning_course).json()
    response = submit(client, challenge, answer)
    assert response.status_code == 200, response.text
    result = response.json()
    assert not result["correct"] and result["next_action"] == "remediate"
    assert result["mastery_after"] == pytest.approx(bkt_update(0.2, False, LearningPolicy()))
    assert bool(result["misconception"]) == (mode == "short_answer")
    before = client.get(f"/api/v1/courses/{learning_course['course_id']}/progress").json()
    assert submit(client, challenge, answer).status_code == 409
    assert client.get(f"/api/v1/courses/{learning_course['course_id']}/progress").json() == before
    for observation in range(2, 4):
        new_challenge = generate(client, learning_course)
        assert new_challenge.status_code == 201, new_challenge.text
        response = submit(client, new_challenge.json(), answer)
        assert response.status_code == 200, response.text
        assert response.json()["next_action"] == ("review" if observation == 3 else "remediate")
    with factory() as db:
        mastery = db.scalar(select(m.MasteryState))
        assert mastery.attempt_count == 3 and mastery.correct_count == 0
    assert client.get(f"/api/v1/courses/{learning_course['course_id']}/game").json()["xp"] == 0


def test_default_factory_and_mock_model_run_adaptive_flow(client, learning_course, factory):
    with factory() as db:
        assert isinstance(factories.create_learning(db), AdaptiveLearningService)
    first = generate(client, learning_course)
    assert first.status_code == 201, first.text
    assert submit(client, first.json(), {"selected_option": 0}).json()[
        "mastery_after"
    ] == pytest.approx(0.6)
    second = generate(client, learning_course)
    assert second.status_code == 201 and second.json()["prompt"] != first.json()["prompt"]
    assert second.json()["difficulty"] == 2


def test_normalized_duplicate_retry_receives_exclusions(client, learning_course):
    def repeat_then_change(payload, draft, count):
        if count == 2:
            draft["prompt"] = "  HOW MANY units are in the sample!!! "
        if count == 3:
            assert payload["excluded_prompts"] == ["How many units are in the sample?"]
            assert any("Duplicate" in c for c in payload["corrections"])
            draft["prompt"] = "Choose the quantity supported by the sample measurement."

    model = ScriptedModel(draft_hook=repeat_then_change)
    use_model(client, model)
    first = generate(client, learning_course).json()
    submit(client, first, {"selected_option": 0})
    second = generate(client, learning_course)
    assert second.status_code == 201 and model.generated == 3
    assert second.json()["prompt"] != first["prompt"]


def test_duplicate_retry_limit_does_not_persist_failed_question(client, learning_course, factory):
    model = ScriptedModel()
    use_model(client, model)
    first = generate(client, learning_course).json()
    submit(client, first, {"selected_option": 0})
    response = generate(client, learning_course)
    assert response.status_code == 422 and model.generated == 4
    assert response.json()["error"]["code"] == "INVALID_CHALLENGE"
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(m.Challenge)) == 1


@pytest.mark.parametrize(
    "flag",
    ["concept_relevant", "answerable", "answer_supported", "consistent", "unique_correct_answer"],
)
def test_failed_verification_is_bounded_and_rolls_back(client, learning_course, factory, flag):
    model = ScriptedModel(verification_hook=lambda data, count: data.update({flag: False}))
    use_model(client, model)
    response = generate(client, learning_course)
    assert response.status_code == 422 and model.generated == 3
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(m.Challenge)) == 0
        assert db.scalar(select(func.count()).select_from(m.MasteryState)) == 0


def test_verification_corrective_retry_succeeds(client, learning_course):
    def first_fails(data, count):
        if count == 1:
            data["issues"] = ["The prompt is ambiguous; name the sample explicitly."]

    model = ScriptedModel(verification_hook=first_fails)
    use_model(client, model)
    assert generate(client, learning_course).status_code == 201
    assert model.generated == 2
    assert "ambiguous" in model.calls[2][1]["corrections"][0]
    assert model.calls[2][1]["rejected_draft"]["prompt"] == "How many units are in the sample?"


def test_verifier_narrows_evidence_and_only_approved_ids_are_persisted(
    client, learning_course, factory
):
    with factory() as db:
        extra = m.SourceChunk(
            course_id=UUID(learning_course["course_id"]),
            concept_id=UUID(learning_course["concept_id"]),
            file_id=UUID(learning_course["file_id"]),
            content="A corroborating note records 10 units for the sample.",
            page_number=8,
        )
        db.add(extra)
        db.commit()
        extra_id = str(extra.id)

    def cite_both(payload, draft, count):
        draft["source_chunk_ids"] = [c["chunk_id"] for c in payload["context"]]

    def approve_only_support(data, count):
        data["source_chunk_ids"] = [learning_course["chunk_id"]]

    model = ScriptedModel(draft_hook=cite_both, verification_hook=approve_only_support)
    use_model(client, model)
    response = generate(client, learning_course)
    assert response.status_code == 201, response.text
    challenge = response.json()
    assert set(model.calls[1][1]["challenge"]["source_chunk_ids"]) == {
        learning_course["chunk_id"],
        extra_id,
    }
    assert challenge["source_chunk_ids"] == [learning_course["chunk_id"]]
    with factory() as db:
        assert db.get(m.Challenge, UUID(challenge["id"])).source_chunk_ids == [
            learning_course["chunk_id"]
        ]
    assessment = submit(client, challenge, {"selected_option": 0})
    assert assessment.status_code == 200
    assert [s["page_number"] for s in assessment.json()["sources"]] == [7]


@pytest.mark.parametrize("evidence", ["invented", "uncited", "empty"])
def test_verifier_cannot_add_or_empty_draft_evidence(client, learning_course, factory, evidence):
    with factory() as db:
        uncited = m.SourceChunk(
            course_id=UUID(learning_course["course_id"]),
            concept_id=UUID(learning_course["concept_id"]),
            file_id=UUID(learning_course["file_id"]),
            content="Another note describes the sample quantity.",
        )
        db.add(uncited)
        db.commit()
        uncited_id = str(uncited.id)

    def cite_one(payload, draft, count):
        draft["source_chunk_ids"] = [learning_course["chunk_id"]]

    def invalid_evidence(data, count):
        data["source_chunk_ids"] = (
            []
            if evidence == "empty"
            else [
                learning_course["chunk_id"],
                uncited_id if evidence == "uncited" else str(uuid4()),
            ]
        )

    model = ScriptedModel(draft_hook=cite_one, verification_hook=invalid_evidence)
    use_model(client, model)
    response = generate(client, learning_course)
    assert response.status_code == 422 and model.generated == 3
    assert response.json()["error"]["code"] == "INVALID_CHALLENGE"
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(m.Challenge)) == 0


@pytest.mark.parametrize(
    "mutation", ["concept", "source", "difficulty", "leaked_key", "duplicate_options", "key_index"]
)
def test_invalid_model_draft_rejected_before_verification(client, learning_course, mutation):
    def mutate(payload, draft, count):
        if mutation == "concept":
            draft["concept_id"] = str(uuid4())
        elif mutation == "source":
            draft["source_chunk_ids"] = [str(uuid4())]
        elif mutation == "difficulty":
            draft["difficulty"] = 3
        elif mutation == "leaked_key":
            draft["content"]["answer_key"] = draft["answer_key"]
        elif mutation == "duplicate_options":
            draft["content"]["options"] = ["10", "10"]
        else:
            draft["answer_key"]["selected_option"] = 99

    model = ScriptedModel(draft_hook=mutate)
    use_model(client, model)
    assert generate(client, learning_course).status_code == 422
    assert len(model.calls) == 3 and model.generated == 3


@pytest.mark.parametrize("invalid", [-1, "NaN", True])
def test_invalid_numerical_tolerance_is_rejected(client, learning_course, invalid):
    model = ScriptedModel(
        "numerical", draft_hook=lambda p, d, n: d["answer_key"].update(tolerance=invalid)
    )
    use_model(client, model)
    assert generate(client, learning_course).status_code == 422


def test_semantically_unusable_numerical_question_rejected(client, learning_course):
    use_model(
        client,
        ScriptedModel("numerical", verification_hook=lambda d, n: d.update(numerical_usable=False)),
    )
    assert generate(client, learning_course).status_code == 422


@pytest.mark.parametrize(
    "value,correct", [(9.9, True), (10.0, True), ("10.1", True), (9.8999, False), (11, False)]
)
def test_numerical_tolerance_boundaries(client, learning_course, value, correct):
    model = ScriptedModel("numerical")
    use_model(client, model)
    challenge = generate(client, learning_course).json()
    response = submit(client, challenge, {"value": value})
    assert response.status_code == 200 and response.json()["correct"] is correct
    assert len(model.calls) == 2


@pytest.mark.parametrize(
    "mode,answer",
    [
        ("mcq", {"selected_option": True}),
        ("mcq", {"selected_option": 99}),
        ("mcq", {"selected_option": 1, "correct": True}),
        ("numerical", {"value": "NaN"}),
        ("numerical", {"value": "Infinity"}),
        ("numerical", {"value": True}),
        ("short_answer", {"text": " "}),
        ("matching", {"matches": [0, 0]}),
        ("sequence", {"order": [1, 0]}),
    ],
)
def test_malformed_answers_do_not_mutate_mastery(client, learning_course, factory, mode, answer):
    use_model(client, ScriptedModel(mode))
    challenge = generate(client, learning_course).json()
    assert submit(client, challenge, answer).status_code == 422
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(m.Attempt)) == 0
        assert db.scalar(select(m.MasteryState)).mastery_score == 0.2


def test_assessment_sources_are_database_metadata_not_retriever_claims(client, learning_course):
    class WrongMetadata(MockKnowledgeService):
        async def get_context_by_ids(self, *args, **kwargs):
            chunks = await super().get_context_by_ids(*args, **kwargs)
            return [
                c.model_copy(update={"source": c.source.model_copy(update={"page_number": 999})})
                for c in chunks
            ]

        async def retrieve_context(self, *args, **kwargs):
            chunks = await super().retrieve_context(*args, **kwargs)
            return [
                c.model_copy(update={"source": c.source.model_copy(update={"page_number": 999})})
                for c in chunks
            ]

    from fastapi import Depends

    from app.db.session import get_db

    def knowledge(db=Depends(get_db)):
        return WrongMetadata(db)

    client.app.dependency_overrides[get_knowledge] = knowledge
    use_model(client, ScriptedModel("short_answer"))
    challenge = generate(client, learning_course).json()
    response = submit(client, challenge, {"text": "A sample contains 10 units."}).json()
    assert response["sources"][0]["page_number"] == 7


def test_grading_loads_original_ids_without_semantic_search(client, learning_course):
    from fastapi import Depends

    from app.db.session import get_db

    use_model(client, ScriptedModel("short_answer"))
    challenge = generate(client, learning_course).json()
    exact_calls = []

    class ExactOnly(MockKnowledgeService):
        async def retrieve_context(self, *args, **kwargs):
            raise AssertionError("Grading must not run semantic retrieval")

        async def get_context_by_ids(self, course_id, chunk_ids, concept_id=None):
            exact_calls.append((course_id, chunk_ids, concept_id))
            return await super().get_context_by_ids(course_id, chunk_ids, concept_id)

    def knowledge(db=Depends(get_db)):
        return ExactOnly(db)

    client.app.dependency_overrides[get_knowledge] = knowledge
    response = submit(client, challenge, {"text": "A sample contains 10 units."})
    assert response.status_code == 200, response.text
    assert exact_calls == [
        (
            UUID(learning_course["course_id"]),
            [UUID(learning_course["chunk_id"])],
            UUID(learning_course["concept_id"]),
        )
    ]
    assert response.json()["sources"][0]["page_number"] == 7


@pytest.mark.parametrize("mutation", ["source_id", "metadata", "score"])
def test_untrusted_short_answer_assessment_is_rejected(client, learning_course, mutation):
    def grade_hook(data):
        if mutation == "source_id":
            data["source_chunk_ids"] = [str(uuid4())]
        elif mutation == "metadata":
            data["sources"] = [{"page_number": 999}]
        else:
            data["score"] = 0

    use_model(client, ScriptedModel("short_answer", grade_hook=grade_hook))
    challenge = generate(client, learning_course).json()
    assert submit(client, challenge, {"text": "A sample contains 10 units."}).status_code == 422


def test_model_unavailability_is_explicit_and_boot_still_works(client, learning_course):
    class OfflineModel(MockModelProvider):
        async def generate_structured(self, messages, schema):
            raise ConnectionError("private endpoint credentials")

    use_model(client, OfflineModel())
    assert client.get("/health").status_code == 200
    response = generate(client, learning_course)
    assert response.status_code == 503 and response.json()["error"]["code"] == "MODEL_UNAVAILABLE"
    assert "private" not in response.text


def test_production_factory_fails_closed_and_mock_remains_available(factory, monkeypatch):
    settings = Settings(
        _env_file=None, environment="production", auth_mode="clerk", model_provider=None
    )
    monkeypatch.setattr(factories, "get_settings", lambda: settings)
    model = factories.create_model()
    assert isinstance(model, UnavailableModelProvider)
    with pytest.raises(AppError) as error:
        asyncio.run(model.generate([]))
    assert error.value.code == "MODEL_UNAVAILABLE"
    with factory() as db:
        assert isinstance(factories.create_learning(db), AdaptiveLearningService)
        settings.learning_mode = "mock"
        with pytest.raises(AppError):
            factories.create_learning(db)
        settings.environment = "test"
        assert isinstance(factories.create_learning(db), MockLearningService)


def test_openapi_has_sources_but_no_internal_answer_keys(client):
    schemas = client.get("/openapi.json").json()["components"]["schemas"]
    assert "answer_key" not in schemas["Challenge"]["properties"]
    assert "sources" in schemas["AssessmentResult"]["properties"]
    assert "ChallengeDraft" not in schemas and "AssessmentDraft" not in schemas


def test_adaptive_cross_course_concept_is_still_rejected(client, learning_course):
    other = client.post("/api/v1/courses", json={"title": "Other"}).json()
    response = client.post(
        "/api/v1/challenges/next",
        json={"course_id": other["id"], "concept_id": learning_course["concept_id"]},
    )
    assert response.status_code == 404


def test_missing_source_context_fails_before_model_call(client, learning_course, factory):
    with factory() as db:
        db.delete(db.get(m.SourceChunk, UUID(learning_course["chunk_id"])))
        db.commit()
    model = ScriptedModel()
    use_model(client, model)
    assert generate(client, learning_course).status_code == 409
    assert model.calls == []


def test_lost_challenge_evidence_does_not_persist_an_attempt(client, learning_course, factory):
    use_model(client, ScriptedModel())
    challenge = generate(client, learning_course).json()
    with factory() as db:
        db.delete(db.get(m.SourceChunk, UUID(learning_course["chunk_id"])))
        db.commit()
    response = submit(client, challenge, {"selected_option": 0})
    assert response.status_code == 409
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(m.Attempt)) == 0
        assert db.scalar(select(m.MasteryState)).attempt_count == 0


def test_model_timeout_is_bounded(client, learning_course, monkeypatch):
    settings = factories.get_settings().model_copy(
        update={"learning": LearningPolicy(model_timeout_seconds=0.001)}
    )
    monkeypatch.setattr(factories, "get_settings", lambda: settings)

    class SlowModel(MockModelProvider):
        async def generate_structured(self, messages, schema):
            await asyncio.sleep(1)
            return await super().generate_structured(messages, schema)

    use_model(client, SlowModel())
    response = generate(client, learning_course)
    assert response.status_code == 503 and response.json()["error"]["code"] == "MODEL_UNAVAILABLE"
