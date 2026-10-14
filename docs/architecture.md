# Platform Foundation v0.1 architecture

The runtime is a modular monolith: one FastAPI API process, one PostgreSQL database,
and optionally a worker process from the **same backend package**. Neon hosts production
PostgreSQL later; Railway hosts the API, worker, and S3-compatible bucket later.
The frontend will be a Next.js React/TypeScript/Tailwind application in `apps/web`.
No real frontend or deployment infrastructure is included in this milestone.

```text
apps/web (Role 1) -> /api/v1 -> schemas + API (Role 4)
                              | auth adapter (Clerk later)
                              | SQLAlchemy -> PostgreSQL / Neon
                              | storage interface -> local files / S3 later
                              | knowledge interface (Role 2)
                              | learning interface (Role 3)
                              | model provider -> mock / open-weight endpoint later
worker (same package) -> processing_jobs -> knowledge service -> persisted course graph
```

## Modules and persistence

- `api/v1`: thin routes, validation, ownership and transaction orchestration.
- `schemas`: shared Pydantic request/response domain contracts, published through OpenAPI.
- `models`, `db`, `migrations`: UUID SQLAlchemy 2 models, UTC timestamps, constraints,
  cascade deletion, initial reversible Alembic migration.
- `services/knowledge`: processing and retrieval. The mock builds an idempotent graph
  with one chapter, one topic, two concepts, a prerequisite, a quest and two source chunks.
- `services/learning`: AdaptiveLearningService orchestrates grounded generation, verification,
  repetition checks, deterministic/model grading, BKT mastery and next-action policy.
  MockLearningService remains available for development fallback and foundation regression tests.
- `services/inference`: ModelProvider abstraction. No network calls or real inference.
- `services/storage`: upload information, metadata and deletion abstraction.
- `services/game`: persisted XP, level, completed challenges and unlocked chapters.
- `workers`: database polling and mock course processing.

The knowledge and learning engines are modules because all four developers share contracts
and persistence in one deployable backend. Python protocols and FastAPI dependencies allow
replacing each mock independently without adding service discovery or cross-service APIs.
`services/factories.py` is the framework-independent selection point for knowledge, learning,
and model providers. FastAPI wrappers in `services/dependencies.py` and the background worker
share that factory; replacing knowledge requires changing only `create_knowledge`.
`get_storage` and `get_auth_provider` select the other adapters. Internal `TutorDraft` lives
in `services/inference/schemas.py` so application services do not depend on inference mocks.
The storage interface covers production operations; the extra local PUT
route belongs specifically to the local adapter and will disappear when using S3 URLs.

The learning factory receives the same ModelProvider dependency used elsewhere in the API.
Production model calls fail closed until a real adapter is selected. Learning retrieves material
through KnowledgeService and only reads attempt history plus citation metadata directly from the
database. Assessment citations are resolved by the platform, and game rewards stay outside AI
code. See [Learning Engine v1](learning-engine.md) for verification, BKT and grading contracts.

## Jobs and transactions

POST `/process` inserts a pending/queued job and returns 202. Existing active jobs are reused.
The worker atomically changes a pending job to processing, records stage progress, writes
the mock graph, then marks it completed. Fixture graph writes and final completion are
transactional; failures roll back graph writes and persist a sanitized `PROCESSING_FAILED`
message. Detailed exceptions stay in worker logs. `file_id` is validated and recorded as
job provenance; the mock always creates the same full course and does not parse that file.

Worker stages mirror the future pipeline, but embeddings/indexing are markers only.
Polling uses the status/created_at index. v0.1 targets one worker. If a worker crashes while
processing, the job stays processing: stop the worker, investigate, reset that job to
pending/queued with progress 0 and cleared timestamps/error in an operator transaction,
then restart. Automatic leases, retries, and resumable per-file processing are future work.

An API dependency commits successful requests and rolls back failed ones. PostgreSQL course
row locks serialize processing requests and mastery/game updates for a course. SQLite is
for tests/single-process demos and does not reproduce PostgreSQL lock behavior. Synchronous
SQLAlchemy and local filesystem access prioritize simplicity; these can block the event loop
briefly in async orchestration routes. Move blocking work off-loop when actual workloads arrive.

## Auth, storage, citations

The development identity cannot be selected via a request header and is forbidden outside
development/test. All resource lookups scope to the current owner. Clerk mode fails closed;
its adapter must verify JWKS signatures, allowed issuer/audience, expiry and subject before
mapping that subject to a local user. No passwords are stored.

Local uploads reserve a DB file record, generate a signed, expiring URL, stream bounded bytes
to a temporary file, and verify size before atomic replacement. Completion verifies metadata.
Possession of a valid signature authorizes only that reserved PUT; regular user authentication
is not required for the upload itself. Presign and completion remain ownership-protected.
Signed URLs are process-local and invalid after restart. Content type/source type are declared
metadata rather than content sniffing. Malware scanning and format validation belong to later
ingestion. Database and filesystem deletion are not a distributed transaction; production
storage cleanup needs retry/reconciliation if a DB deletion fails after object deletion.

SourceReference is a value object projected from `source_chunks` plus `course_files`; it
does not need a standalone table. AssessmentResult is stored as JSON on its Attempt.
Tutor messages persist provider chunk IDs; the platform scopes those IDs to retrieved chunks
and resolves metadata from the database. The mock uses a named synthetic text source,
never inventing page/slide numbers or attributing mock content to an uploaded document.
Future extraction is responsible for authoritative page/slide/timestamp metadata.

An embedding column can be added to `source_chunks` through a later pgvector Alembic migration.
UUID, JSON and timezone types are portable in tests. PostgreSQL is the deployment target.
