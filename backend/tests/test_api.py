import asyncio
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.auth import ClerkAuthProvider, get_auth_provider
from app.models import domain as m
from app.schemas import domain as s
from app.services import factories
from app.services.dependencies import get_model
from app.services.inference.mock import MockModelProvider
from app.services.inference.schemas import TutorDraft
from app.services.storage.local import get_storage
from app.workers.processing import execute_job, run_once


def test_health_and_openapi(client):
    assert client.get("/health").json() == {"status": "ok", "version": "0.1.0"}
    assert client.get("/docs").status_code == 200
    spec = client.get("/openapi.json").json()
    assert "/api/v1/tutor/chat" in spec["paths"]
    assert "answer_key" not in spec["components"]["schemas"]["Challenge"]["properties"]
    assert spec["components"]["schemas"]["ChallengeMode"]["enum"] == [
        "mcq",
        "matching",
        "sequence",
        "short_answer",
        "numerical",
    ]


def test_course_crud(client, course):
    assert s.Course.model_validate(course).created_at.tzinfo is not None
    assert client.get(f"/api/v1/courses/{course['id']}").json() == course
    assert client.get("/api/v1/courses").json() == [course]
    assert client.delete(f"/api/v1/courses/{course['id']}").status_code == 204
    assert client.get("/api/v1/courses").json() == []


def test_missing_course(client):
    response = client.get(f"/api/v1/courses/{uuid4()}")
    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "COURSE_NOT_FOUND",
            "message": "The requested course does not exist.",
            "details": {},
        }
    }


def test_validation(client):
    assert client.post("/api/v1/courses", json={"title": " "}).status_code == 422
    assert client.get("/api/v1/courses/not-a-uuid").json()["error"]["code"] == "VALIDATION_ERROR"


def test_empty_course_before_processing(client, course):
    assert client.get(f"/api/v1/courses/{course['id']}/map").json()["chapters"] == []
    assert (
        client.post("/api/v1/challenges/next", json={"course_id": course["id"]}).status_code == 409
    )
    assert client.get(f"/api/v1/courses/{course['id']}/progress").json()["average_mastery"] == 0
    assert client.get(f"/api/v1/courses/{course['id']}/game").json()["xp"] == 0
    tutor = client.post(
        "/api/v1/tutor/chat", json={"course_id": course["id"], "message": "Help"}
    ).json()
    assert tutor["answer_type"] == "general_knowledge"
    assert tutor["sources"] == []


def test_processing_and_course_map(client, processed_course, factory):
    cid = processed_course["id"]
    result = s.CourseMap.model_validate(client.get(f"/api/v1/courses/{cid}/map").json())
    assert len(result.chapters) == 1
    assert len(result.chapters[0].topics[0].concepts) == 2
    assert len(result.prerequisites) == 1
    concept = result.chapters[0].topics[0].concepts[0]
    assert client.get(f"/api/v1/concepts/{concept.id}").status_code == 200
    client.post(f"/api/v1/courses/{cid}/process")
    assert asyncio.run(run_once(factory))
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(m.Chapter)) == 1
        assert db.scalar(select(func.count()).select_from(m.SourceChunk)) == 2


def test_active_job_is_reused(client, course):
    first = client.post(f"/api/v1/courses/{course['id']}/process").json()
    second = client.post(f"/api/v1/courses/{course['id']}/process").json()
    assert first["id"] == second["id"]
    assert first["stage"] == "queued" and first["progress"] == 0


def test_challenge_attempt_progress_and_game(client, processed_course, factory):
    cid = processed_course["id"]
    response = client.post("/api/v1/challenges/next", json={"course_id": cid})
    assert response.status_code == 201
    challenge = s.Challenge.model_validate(response.json())
    assert challenge.mode == "mcq" and len(challenge.content["options"]) == 4
    assert challenge.source_chunk_ids
    payload = {
        "challenge_id": str(challenge.id),
        "answer": {"selected_option": 0},
        "time_taken_seconds": 14,
    }
    response = client.post("/api/v1/attempts", json=payload)
    assert response.status_code == 200
    assessment = s.AssessmentResult.model_validate(response.json())
    assert assessment.correct and assessment.mastery_before == 0 and assessment.mastery_after == 0.2
    progress = s.ProgressResponse.model_validate(
        client.get(f"/api/v1/courses/{cid}/progress").json()
    )
    assert progress.mastery[0].attempt_count == 1
    assert progress.average_mastery == 0.1  # Includes the unattempted second concept.
    game = s.GameState.model_validate(client.get(f"/api/v1/courses/{cid}/game").json())
    assert game.xp == 20 and game.completed_challenges == [challenge.id]
    assert game.unlocked_chapter_ids
    client.post("/api/v1/attempts", json=payload)
    assert client.get(f"/api/v1/courses/{cid}/game").json()["xp"] == 20
    payload["answer"] = {"selected_option": 2}
    wrong = client.post("/api/v1/attempts", json=payload).json()
    assert not wrong["correct"] and wrong["misconception"] and wrong["mastery_after"] == 0.3
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(m.Attempt)) == 3


def test_invalid_attempt_rolls_back(client, processed_course):
    challenge = client.post(
        "/api/v1/challenges/next", json={"course_id": processed_course["id"]}
    ).json()
    for answer in [{"selected_option": 99}, {"selected_option": True}, {"text": "guess"}]:
        response = client.post(
            "/api/v1/attempts",
            json={"challenge_id": challenge["id"], "answer": answer, "time_taken_seconds": 1},
        )
        assert (
            response.status_code == 422 and response.json()["error"]["code"] == "INVALID_CHALLENGE"
        )
    state = client.get(f"/api/v1/courses/{processed_course['id']}/progress").json()["mastery"][0]
    assert state["attempt_count"] == 0


def test_tutor_authoritative_sources(client, processed_course, factory):
    response = client.post(
        "/api/v1/tutor/chat",
        json={"course_id": processed_course["id"], "message": "What is active recall?"},
    )
    assert response.status_code == 200
    tutor = s.TutorResponse.model_validate(response.json())
    assert tutor.answer_type == "source_backed" and len(tutor.sources) == 2
    assert all(src.source_type == "text" and src.page_number is None for src in tutor.sources)
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(m.TutorMessage)) == 2
        assert db.get(m.CourseFile, tutor.sources[0].file_id).filename == "mock-learning-notes.txt"


def test_tutor_ignores_provider_fabricated_ids(client, processed_course):
    class FabricatingProvider(MockModelProvider):
        async def generate_structured(self, messages, schema):
            assert schema is TutorDraft
            return schema.model_validate(
                {"answer": "A mock answer", "source_chunk_ids": [str(uuid4()), "not-a-uuid"]}
            )

    client.app.dependency_overrides[get_model] = lambda: FabricatingProvider()
    result = client.post(
        "/api/v1/tutor/chat", json={"course_id": processed_course["id"], "message": "Explain"}
    ).json()
    assert result["sources"] == [] and result["answer_type"] == "general_knowledge"


def test_upload_end_to_end(client, course):
    payload = {
        "course_id": course["id"],
        "filename": "notes.txt",
        "source_type": "text",
        "content_type": "text/plain",
        "size_bytes": 5,
    }
    response = client.post("/api/v1/uploads/presign", json=payload)
    assert response.status_code == 200
    info = response.json()
    complete = f"/api/v1/courses/{course['id']}/files/complete"
    assert client.post(complete, json={"file_id": info["file_id"]}).status_code == 422
    assert (
        client.put(info["upload_url"], content=b"hello", headers=info["headers"]).status_code == 204
    )
    file = client.post(complete, json={"file_id": info["file_id"]}).json()
    assert file["upload_completed"] and file["size_bytes"] == 5
    assert (
        client.put(info["upload_url"], content=b"hello", headers=info["headers"]).status_code == 409
    )
    assert (
        client.post(
            f"/api/v1/courses/{course['id']}/process", json={"file_id": info["file_id"]}
        ).status_code
        == 202
    )


def test_upload_validation(client, course):
    payload = {
        "course_id": course["id"],
        "filename": "notes.txt",
        "source_type": "exe",
        "content_type": "text/plain",
        "size_bytes": 5,
    }
    assert (
        client.post("/api/v1/uploads/presign", json=payload).json()["error"]["code"]
        == "INVALID_FILE_TYPE"
    )
    payload["source_type"] = "text"
    info = client.post("/api/v1/uploads/presign", json=payload).json()
    assert (
        client.put(
            info["upload_url"] + "bad", content=b"hello", headers=info["headers"]
        ).status_code
        == 401
    )
    assert (
        client.put(info["upload_url"], content=b"too long", headers=info["headers"]).status_code
        == 413
    )
    assert (
        client.post(
            f"/api/v1/courses/{course['id']}/process", json={"file_id": info["file_id"]}
        ).status_code
        == 422
    )


def test_clerk_skeleton_fails_closed(client):
    client.app.dependency_overrides[get_auth_provider] = lambda: ClerkAuthProvider()
    response = client.get("/api/v1/courses", headers={"Authorization": "Bearer unverified"})
    assert response.status_code == 401 and response.json()["error"]["code"] == "UNAUTHORIZED"
    assert client.get("/health").status_code == 200


def test_signed_upload_authorizes_put_without_user_auth(client, course, monkeypatch):
    payload = {
        "course_id": course["id"],
        "filename": "notes.txt",
        "source_type": "text",
        "content_type": "text/plain",
        "size_bytes": 5,
    }
    info = client.post("/api/v1/uploads/presign", json=payload).json()
    # Clerk fails closed, so a successful PUT proves it never uses regular auth.
    client.app.dependency_overrides[get_auth_provider] = lambda: ClerkAuthProvider()
    assert client.post("/api/v1/uploads/presign", json=payload).status_code == 401
    complete_url = f"/api/v1/courses/{course['id']}/files/complete"
    assert client.post(complete_url, json={"file_id": info["file_id"]}).status_code == 401
    assert "Authorization" not in info["headers"]
    assert (
        client.put(info["upload_url"], content=b"hello", headers=info["headers"]).status_code == 204
    )
    assert (
        client.put(
            info["upload_url"] + "bad", content=b"hello", headers=info["headers"]
        ).status_code
        == 401
    )
    import time

    expired_time = time.time() + info["expires_in_seconds"] + 1
    monkeypatch.setattr("app.services.storage.local.time.time", lambda: expired_time)
    assert (
        client.put(info["upload_url"], content=b"hello", headers=info["headers"]).status_code == 401
    )


def test_signed_upload_requires_reservation_and_matching_content(client, course, factory):
    payload = {
        "course_id": course["id"],
        "filename": "notes.txt",
        "source_type": "text",
        "content_type": "text/plain",
        "size_bytes": 5,
    }
    info = client.post("/api/v1/uploads/presign", json=payload).json()
    assert (
        client.put(
            info["upload_url"], content=b"hello", headers={"Content-Type": "image/png"}
        ).status_code
        == 422
    )
    assert client.put(info["upload_url"], content=b"hi", headers=info["headers"]).status_code == 422
    storage = client.app.dependency_overrides[get_storage]()
    assert not storage.path(info["object_key"]).exists()
    with factory() as db:
        db.delete(db.get(m.CourseFile, UUID(info["file_id"])))
        db.commit()
    assert (
        client.put(info["upload_url"], content=b"hello", headers=info["headers"]).status_code == 404
    )


def test_api_and_worker_share_knowledge_factory(client, course, factory, monkeypatch):
    original = factories.create_knowledge
    constructed_with = []

    def create_knowledge(db):
        constructed_with.append(db)
        return original(db)

    monkeypatch.setattr(factories, "create_knowledge", create_knowledge)
    assert client.get(f"/api/v1/courses/{course['id']}/map").status_code == 200
    assert len(constructed_with) == 1
    assert client.post(f"/api/v1/courses/{course['id']}/process").status_code == 202
    assert asyncio.run(run_once(factory))
    assert len(constructed_with) == 2


def test_numerical_contract_persists_but_mock_evaluation_is_not_implemented(
    client, processed_course, factory
):
    challenge = client.post(
        "/api/v1/challenges/next", json={"course_id": processed_course["id"]}
    ).json()
    assert (
        s.Challenge.model_validate({**challenge, "mode": "numerical"}).mode
        == s.ChallengeMode.numerical
    )
    with factory() as db:
        stored = db.get(m.Challenge, UUID(challenge["id"]))
        stored.mode = "numerical"
        db.commit()
        stored.mode = "unsupported"
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()
        assert db.get(m.Challenge, UUID(challenge["id"])).mode == "numerical"
    response = client.post(
        "/api/v1/attempts",
        json={
            "challenge_id": challenge["id"],
            "answer": {"value": 42},
            "time_taken_seconds": 1,
        },
    )
    assert response.status_code == 422 and response.json()["error"]["code"] == "INVALID_CHALLENGE"


def test_other_user_cannot_access_owned_resources(client, processed_course, factory):
    cid = processed_course["id"]
    course_map = client.get(f"/api/v1/courses/{cid}/map").json()
    concept_id = course_map["chapters"][0]["topics"][0]["concepts"][0]["id"]
    challenge = client.post("/api/v1/challenges/next", json={"course_id": cid}).json()
    job = client.post(f"/api/v1/courses/{cid}/process").json()

    class OtherUser:
        async def authenticate(self, request):
            return uuid4(), "another-user"

    # A stable identity for all requests.
    other_id = uuid4()

    class StableOtherUser(OtherUser):
        async def authenticate(self, request):
            return other_id, "another-user"

    client.app.dependency_overrides[get_auth_provider] = lambda: StableOtherUser()
    assert client.get("/api/v1/courses").json() == []
    for url in [
        f"/api/v1/courses/{cid}",
        f"/api/v1/courses/{cid}/map",
        f"/api/v1/courses/{cid}/game",
        f"/api/v1/courses/{cid}/progress",
        f"/api/v1/concepts/{concept_id}",
        f"/api/v1/jobs/{job['id']}",
    ]:
        assert client.get(url).status_code == 404
    assert client.delete(f"/api/v1/courses/{cid}").status_code == 404
    assert (
        client.post(
            "/api/v1/attempts",
            json={
                "challenge_id": challenge["id"],
                "answer": {"selected_option": 0},
                "time_taken_seconds": 1,
            },
        ).status_code
        == 404
    )
    assert (
        client.post("/api/v1/tutor/chat", json={"course_id": cid, "message": "Help"}).status_code
        == 404
    )


def test_delete_cascades_processed_data(client, processed_course, factory):
    cid = processed_course["id"]
    challenge = client.post("/api/v1/challenges/next", json={"course_id": cid}).json()
    client.post(
        "/api/v1/attempts",
        json={
            "challenge_id": challenge["id"],
            "answer": {"selected_option": 0},
            "time_taken_seconds": 1,
        },
    )
    client.post("/api/v1/tutor/chat", json={"course_id": cid, "message": "Help"})
    assert client.delete(f"/api/v1/courses/{cid}").status_code == 204
    with factory() as db:
        for model in [
            m.CourseFile,
            m.ProcessingJob,
            m.Chapter,
            m.Topic,
            m.Concept,
            m.ConceptPrerequisite,
            m.SourceChunk,
            m.Challenge,
            m.Attempt,
            m.MasteryState,
            m.GameState,
            m.Quest,
            m.TutorConversation,
            m.TutorMessage,
        ]:
            assert db.scalar(select(func.count()).select_from(model)) == 0


def test_processing_failure_persisted_and_atomic(client, course, factory):
    job = client.post(f"/api/v1/courses/{course['id']}/process").json()

    class BrokenKnowledge:
        async def process_course(self, course_id):
            raise RuntimeError("private provider details")

    with factory() as db:
        assert asyncio.run(execute_job(db, UUID(job["id"]), BrokenKnowledge()))
        assert not asyncio.run(execute_job(db, UUID(job["id"]), BrokenKnowledge()))
    response = client.get(f"/api/v1/jobs/{job['id']}").json()
    assert response["status"] == "failed" and response["completed_at"]
    assert "PROCESSING_FAILED" in response["error"] and "private" not in response["error"]


def test_invalid_file_and_concept_course_association(client, processed_course):
    other = client.post("/api/v1/courses", json={"title": "Other"}).json()
    concept = client.get(f"/api/v1/courses/{processed_course['id']}/map").json()["chapters"][0][
        "topics"
    ][0]["concepts"][0]
    assert (
        client.post(
            "/api/v1/challenges/next", json={"course_id": other["id"], "concept_id": concept["id"]}
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/v1/tutor/chat",
            json={"course_id": other["id"], "concept_id": concept["id"], "message": "Help"},
        ).status_code
        == 404
    )
