# Frontend Integration

The hackathon frontend is under `apps/web` and preserves AJ's Questoriaa visual system while wiring the critical learning flow to the existing FastAPI contracts.

## Live flow

Dashboard → Create Course → PDF/PPTX upload → Processing → Course Map → Concept → Adaptive Challenge → Assessment feedback → BKT mastery / XP → source-grounded tutor.

## Backend routes used

- `POST /api/v1/courses`
- `GET /api/v1/courses`
- `POST /api/v1/uploads/presign`
- signed `PUT` upload URL
- `POST /api/v1/courses/{course_id}/files/complete`
- `POST /api/v1/courses/{course_id}/process`
- `GET /api/v1/jobs/{job_id}`
- `GET /api/v1/courses/{course_id}/map`
- `GET /api/v1/concepts/{concept_id}`
- `POST /api/v1/challenges/next`
- `POST /api/v1/attempts`
- `GET /api/v1/courses/{course_id}/progress`
- `GET /api/v1/courses/{course_id}/game`
- `POST /api/v1/tutor/chat`

The frontend does not calculate challenge correctness, mastery, XP, difficulty, unlocks, or citations. Those remain backend-owned.

## Authentication

Clerk protects application routes and the `/backend-api/*` gateway in Next.js. For the controlled hackathon demo FastAPI uses `ENVIRONMENT=development` and `AUTH_MODE=development`; backend JWT verification is not implemented. All signed-in users share the development identity. Keep the deployed API private. See [Railway setup](railway.md).

## Truthful MVP limits

- PDF/PPTX text ingestion is integrated.
- OCR, image understanding, audio and video ingestion are not implemented.
- Community, Achievements, Settings, and some dashboard widgets remain visual/demo data.
- Live course pages, challenges, mastery, game state, and tutor citations use backend responses.

Dashboard Aria and the course-map tutor now call `/tutor/chat`. Library lists all real courses; Mastery and Quests offer a course selector, backend mastery/XP/level and links to real concepts. Their original visual sections are preserved under an explicit preview disclosure. Course maps show returned prerequisite relationships and backend unlock state; studying later chapters is still allowed by the backend.

Processing polls stop on completion/failure/unmount, abort requests on unmount, and offer status retry on transient errors. Missing or mismatched job IDs show an error. Duplicate attempts offer a new challenge; a saved assessment stays visible if refreshing progress fails. Matching/sequence selectors prevent duplicate indices. Numerical zero is valid; blank/non-finite answers are rejected.

`node --test tests/api.test.mjs` from `apps/web` checks upload URL/header handling, answer payloads, 409 propagation and source labels. Tests use isolated HTTP doubles; the application never silently switches to fixtures.
