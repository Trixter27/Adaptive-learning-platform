import asyncio
import json
import traceback
from uuid import UUID, uuid4

import httpx
import pytest
from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.errors import AppError
from app.models import domain as m
from app.services import factories
from app.services.dependencies import get_model
from app.services.inference.mock import MockModelProvider
from app.services.inference.openai_compat import OpenAICompatibleModelProvider
from app.services.inference.schemas import (
    AssessmentDraft,
    ChallengeDraft,
    QuestionVerificationDraft,
    TutorDraft,
)
from app.services.inference.unavailable import UnavailableModelProvider
from app.services.knowledge.schemas import CourseDraft


class ExampleDraft(BaseModel):
    answer: str = Field(min_length=1)


def run(awaitable):
    return asyncio.run(awaitable)


def completion(content):
    return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})


@pytest.fixture
def endpoint(monkeypatch):
    client_type = httpx.AsyncClient
    requests = []

    def install(handler):
        async def wrapped(request):
            requests.append(request)
            result = handler(request)
            return await result if hasattr(result, "__await__") else result

        monkeypatch.setattr(
            httpx,
            "AsyncClient",
            lambda **kwargs: client_type(transport=httpx.MockTransport(wrapped), **kwargs),
        )
        return requests

    return install


def provider(**kwargs):
    return OpenAICompatibleModelProvider("https://model.test/v1/", "test-secret", "qwen", **kwargs)


def test_normal_generation_preserves_roles_and_model(endpoint):
    requests = endpoint(lambda request: completion("  Hello  "))
    messages = [
        {"role": "system", "content": "Be concise"},
        {"role": "user", "content": "Hi"},
        {"role": "assistant", "content": "Previous reply"},
    ]
    assert run(provider().generate(messages)) == "Hello"
    assert str(requests[0].url) == "https://model.test/v1/chat/completions"
    payload = json.loads(requests[0].content)
    assert payload["messages"] == messages and payload["model"] == "qwen"
    assert "response_format" not in payload
    assert requests[0].headers["Authorization"] == "Bearer test-secret"


@pytest.mark.parametrize(
    "content",
    [
        '{"answer":"Valid"}',
        '```json\n{"answer":"Valid"}\n```',
        '<think>Reasoning</think>\n{"answer":"Valid"}',
    ],
)
def test_structured_schema_and_wrapping(endpoint, content):
    requests = endpoint(lambda request: completion(content))
    assert (
        run(
            provider().generate_structured([{"role": "user", "content": "Answer"}], ExampleDraft)
        ).answer
        == "Valid"
    )
    payload = json.loads(requests[0].content)
    assert payload["response_format"] == {"type": "json_object"}
    assert '"title": "ExampleDraft"' in payload["messages"][0]["content"]


@pytest.mark.parametrize("invalid", ["not JSON", "{}", '{"answer":""}'])
def test_structured_validation_retry(endpoint, invalid):
    responses = iter([completion(invalid), completion('{"answer":"Corrected"}')])
    requests = endpoint(lambda request: next(responses))
    assert run(provider().generate_structured([], ExampleDraft)).answer == "Corrected"
    assert len(requests) == 2
    retry = json.loads(requests[1].content)["messages"][-1]["content"]
    assert "Validation issues:" in retry
    assert "test-secret" not in retry and invalid not in retry


def test_validation_exhaustion_is_sanitized(endpoint):
    requests = endpoint(lambda request: completion('{"private":"test-secret"}'))
    with pytest.raises(AppError) as error:
        run(provider().generate_structured([], ExampleDraft))
    assert len(requests) == 2
    assert error.value.status == 503 and error.value.code == "MODEL_UNAVAILABLE"
    assert "schema validation" in error.value.message
    assert "test-secret" not in "".join(traceback.format_exception(error.value))


def test_json_mode_fallback_is_bounded(endpoint):
    responses = iter(
        [
            httpx.Response(400, text="response_format is unsupported"),
            completion('{"answer":"Fallback"}'),
        ]
    )
    requests = endpoint(lambda request: next(responses))
    assert run(provider().generate_structured([], ExampleDraft)).answer == "Fallback"
    assert "response_format" not in json.loads(requests[1].content)


@pytest.mark.parametrize("status, attempts", [(401, 1), (403, 1), (400, 1), (429, 2), (503, 2)])
def test_http_failure_retry_limits_and_sanitization(endpoint, status, attempts):
    requests = endpoint(lambda request: httpx.Response(status, text="test-secret sensitive body"))
    with pytest.raises(AppError) as error:
        run(provider().generate([]))
    assert len(requests) == attempts
    assert "test-secret" not in "".join(traceback.format_exception(error.value))


def test_transient_http_failure_recovers(endpoint):
    responses = iter([httpx.Response(503), completion("Recovered")])
    requests = endpoint(lambda request: next(responses))
    assert run(provider().generate([])) == "Recovered"
    assert len(requests) == 2


def test_connection_timeout_retries_then_fails(endpoint):
    def timeout(request):
        raise httpx.ReadTimeout("test-secret", request=request)

    requests = endpoint(timeout)
    with pytest.raises(AppError) as error:
        run(provider().generate([]))
    assert len(requests) == 2
    assert "test-secret" not in "".join(traceback.format_exception(error.value))


def test_aggregate_deadline_bounds_entire_call(endpoint):
    async def delayed(request):
        await asyncio.sleep(0.1)
        return completion("Too late")

    requests = endpoint(delayed)
    with pytest.raises(AppError, match="timed out"):
        run(provider(timeout_seconds=0.01).generate_structured([], ExampleDraft))
    assert len(requests) == 1


@pytest.mark.parametrize("content", [None, "", "  ", "<think>Only reasoning</think>"])
def test_empty_response_fails_cleanly(endpoint, content):
    endpoint(lambda request: completion(content))
    with pytest.raises(AppError) as error:
        run(provider().generate([]))
    assert error.value.code == "MODEL_UNAVAILABLE"


def test_malformed_http_envelope(endpoint):
    endpoint(lambda request: httpx.Response(200, json={"choices": []}))
    with pytest.raises(AppError, match="no usable response"):
        run(provider().generate([]))


@pytest.mark.parametrize(
    "selection, expected",
    [
        ("mock", MockModelProvider),
        ("openai", OpenAICompatibleModelProvider),
        ("unavailable", UnavailableModelProvider),
    ],
)
def test_factory_selection(monkeypatch, selection, expected):
    settings = Settings(_env_file=None, model_provider=selection, model_base_url="", model_name="")
    monkeypatch.setattr(factories, "get_settings", lambda: settings)
    assert isinstance(factories.create_model(), expected)
    if selection == "mock":
        assert run(factories.create_model().generate([])).startswith("Mock tutor:")


def test_no_configuration_boots_without_network(client, monkeypatch):
    settings = Settings(_env_file=None, model_provider="openai", model_base_url="", model_name="")
    monkeypatch.setattr(factories, "get_settings", lambda: settings)
    assert client.get("/openapi.json").status_code == 200
    with pytest.raises(AppError, match="Configure MODEL_BASE_URL"):
        run(factories.create_model().generate([]))


def test_nonstandard_tutor_roles_are_grounded_user_data(endpoint):
    chunk_id = str(uuid4())
    requests = endpoint(
        lambda request: completion(
            json.dumps({"answer": "Source answer", "source_chunk_ids": [chunk_id]})
        )
    )
    messages = [
        {"role": "user", "content": "Question"},
        {"role": "context", "content": "Evidence"},
        {"role": "chunk_id", "content": chunk_id},
    ]
    draft = run(provider().generate_structured(messages, TutorDraft))
    assert draft.source_chunk_ids == [chunk_id]
    sent = json.loads(requests[0].content)["messages"]
    assert {message["role"] for message in sent} == {"system", "user"}
    assert json.loads(sent[-2]["content"]) == {"kind": "context", "content": "Evidence"}
    assert messages[1]["role"] == "context"


def test_realistic_challenge_draft(endpoint):
    data = {
        "concept_id": str(uuid4()),
        "mode": "mcq",
        "title": "Practice",
        "prompt": "Which?",
        "difficulty": 1,
        "content": {"options": ["Correct", "Incorrect"]},
        "answer_key": {"selected_option": 0},
        "source_chunk_ids": [str(uuid4())],
    }
    endpoint(lambda request: completion(json.dumps(data)))
    assert run(provider().generate_structured([], ChallengeDraft)).model_dump(mode="json") == data


def test_media_remains_explicitly_unsupported():
    with pytest.raises(AppError, match="Media analysis is not supported"):
        run(provider().analyze_media(b"image", "Describe"))


def test_existing_tutor_learning_and_curriculum_calls(endpoint, client, processed_course, factory):
    schemas = {
        schema.__name__: schema
        for schema in [
            TutorDraft,
            CourseDraft,
            ChallengeDraft,
            QuestionVerificationDraft,
            AssessmentDraft,
        ]
    }
    seen = []

    async def handler(request):
        sent = json.loads(request.content)["messages"]
        schema_name = json.loads(sent[0]["content"].split("JSON schema: ", 1)[1])["title"]
        seen.append(schema_name)
        messages = []
        for message in sent[1:]:
            try:
                data = json.loads(message["content"])
            except ValueError:
                data = {}
            messages.append(
                {"role": data["kind"], "content": data["content"]} if "kind" in data else message
            )
        draft = await MockModelProvider().generate_structured(messages, schemas[schema_name])
        return completion(draft.model_dump_json())

    endpoint(handler)
    real = provider()
    client.app.dependency_overrides[get_model] = lambda: real
    course_id = processed_course["id"]
    concept = client.get(f"/api/v1/courses/{course_id}/map").json()["chapters"][0]["topics"][0][
        "concepts"
    ][0]
    assert (
        client.post(
            "/api/v1/tutor/chat", json={"course_id": course_id, "message": "Explain"}
        ).status_code
        == 200
    )
    challenge = client.post(
        "/api/v1/challenges/next", json={"course_id": course_id, "concept_id": concept["id"]}
    )
    assert challenge.status_code == 201, challenge.text
    response = client.post(
        "/api/v1/attempts",
        json={
            "challenge_id": challenge.json()["id"],
            "answer": {"selected_option": 0},
            "time_taken_seconds": 5,
        },
    )
    assert response.status_code == 200, response.text
    # Exercise the existing short-answer grading prompt through the adapter too.
    with factory() as db:
        short = db.get(m.Challenge, UUID(challenge.json()["id"]))
        short.mode, short.content, short.answer_key = (
            "short_answer",
            {},
            {"expected_answer": "Evidence"},
        )
        learner = factories.create_learning(db, real)
        context = run(
            factories.create_knowledge(db).get_context_by_ids(
                UUID(course_id), [UUID(id_) for id_ in short.source_chunk_ids], short.concept_id
            )
        )
        run(learner.evaluate_answer(short, {"text": "Evidence"}, context))
    draft = run(
        real.generate_structured(
            [
                {
                    "role": "user",
                    "content": json.dumps(
                        {"title": "Example", "sources": [{"number": 1, "content": "Evidence"}]}
                    ),
                }
            ],
            CourseDraft,
        )
    )
    assert draft.chapters
    assert set(seen) == set(schemas)
