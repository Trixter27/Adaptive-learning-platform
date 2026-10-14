# Adaptive Learning Platform

Platform Foundation v0.1 for a four-person hackathon: source-grounded tutoring,
assessment, and gamified progression. A FastAPI modular monolith owns persistence
and contracts; knowledge, learning, inference, and storage are replaceable service modules.
Questoriaa Learning Engine v1 adds adaptive challenge orchestration, verification, grading,
and Bayesian Knowledge Tracing. Local model and knowledge adapters remain deterministic mocks.
The frontend workspace is `apps/web`. See [learning engine](docs/learning-engine.md).

## Prerequisites

- Python 3.11+ (verified with 3.12)
- PostgreSQL 15+ for the default development database, or a Neon connection string
- PowerShell commands below run from the repository root

## Install and configure

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e "backend[test]"
Copy-Item .env.example .env
```

Edit `.env` with your PostgreSQL credentials. Never commit `.env`.
The backend and Alembic read the root `.env` regardless of the working directory.
Relative `LOCAL_STORAGE_PATH` values resolve against the command's working directory;
use an absolute path if you start the worker elsewhere.

Create the local database (assuming `psql` is on PATH and PostgreSQL is running):

```powershell
psql -U postgres -h localhost -c "CREATE DATABASE adaptive_learning;"
.\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini upgrade head
```

For Neon, set `DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=require`.
Percent-encode special characters in credentials. pgvector is not required.
Application startup does not create tables: run migrations before using domain routes.

## Run

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

- Health: <http://localhost:8000/health> (liveness, does not probe database)
- Interactive API docs: <http://localhost:8000/docs>
- OpenAPI: <http://localhost:8000/openapi.json>

In a second terminal at the repository root, start the database-backed mock worker:

```powershell
.\.venv\Scripts\python.exe -m app.workers.processing --poll
```

Use `--once` to process at most one pending job. POSTing `/process` queues a job;
GET `/jobs/{job_id}` polls its status. Course maps stay empty until processing completes.
No Redis, Celery, model endpoint, Clerk credential, or storage credential is needed locally.

## Optional SQLite smoke demo

PostgreSQL remains the production database. For a quick local demo without PostgreSQL,
set this environment variable in **both API and worker terminals**, then run the same commands:

```powershell
$env:DATABASE_URL = "sqlite:///./backend/local.db"
.\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

## Tests and checks

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
.\.venv\Scripts\python.exe -m ruff check backend
```

For Windows temp permission issues, use a fresh local directory without pytest's cache:

```powershell
$learningTemp = Join-Path (Get-Location).Path (".pytest_tmp\learning-" + [guid]::NewGuid().ToString("N"))
.\.venv\Scripts\python.exe -m pytest backend/tests -q -p no:cacheprovider --basetemp $learningTemp
```

`LEARNING_MODE=adaptive` is the default; `mock` selects the legacy learner for local fallback.
The adaptive service supports all five challenge modes; the local mock model generates MCQs.
Production model calls fail explicitly until a real ModelProvider is selected in the factory.

Tests use isolated in-memory SQLite databases and temporary storage; they ignore production
database/auth environment settings and never call an AI API. PostgreSQL's concurrent row
locking and live Neon connectivity need separate integration verification.

## Authentication and uploads

`AUTH_MODE=development` uses one fixed local user (`DEV_USER_ID`) and is only permitted
when `ENVIRONMENT` is `development` or `test`. All domain endpoints enforce course ownership.
Set `AUTH_MODE=clerk` for the future production adapter; it currently returns `UNAUTHORIZED`
until real JWT verification is implemented. Never deploy development auth publicly.

Local presign responses supply a relative signed PUT URL, headers, and a file ID.
Upload the bytes, then call `/files/complete`. The backend verifies object existence/size.
Local URLs expire after 15 minutes or on API restart. Possession of a valid signed URL
authorizes that specific PUT without Clerk/user authentication; treat it as a temporary
credential. Presign and completion endpoints still require the course owner's authentication.
Use one API process for this milestone. S3 will replace the storage adapter later.

## Ownership and branch workflow

| Role | Ownership |
| --- | --- |
| 1 Frontend / Game | `apps/web`, UI, API consumption |
| 2 Knowledge / AI | `services/knowledge`, extraction, retrieval, model integration |
| 3 Learning / Assessment | `services/learning`, challenge evaluation, mastery |
| 4 Platform / Integration | API, DB, schemas, auth, storage, workers, persistence |

Work on your assigned feature branch (`feature/learning-engine` for the learning engine).
Agree on shared schema changes across roles; generate frontend types from OpenAPI.
Open reviewed PRs through the team's develop/main workflow. Do not push or merge another
developer's work without agreement. This task does not commit, push, or merge.

Read [architecture](docs/architecture.md), [contracts](docs/contracts.md), and
[API examples](docs/api.md) before integrating. Next: Role 1 can connect the create-course →
process → poll → map → challenge → attempt → progress flow. Next engine integration is a real
ModelProvider for generation, verification and short-answer grading through the existing factory.
