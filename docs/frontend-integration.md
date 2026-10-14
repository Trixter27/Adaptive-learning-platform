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

Clerk protects application routes in Next.js. For the local hackathon demo FastAPI should remain on `AUTH_MODE=development`; the current Clerk backend provider intentionally fails closed because JWT verification is not yet implemented.

## Truthful MVP limits

- PDF/PPTX text ingestion is integrated.
- OCR, image understanding, audio and video ingestion are not implemented.
- Community, Achievements, Settings, and some dashboard widgets remain visual/demo data.
- Live course pages, challenges, mastery, game state, and tutor citations use backend responses.
