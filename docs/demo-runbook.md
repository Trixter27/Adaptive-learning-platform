# Questoriaa Demo Runbook

Use this before recording the final submission video.

## 1. Colab / Ollama

Keep the Colab runtime and Cloudflare tunnel alive.

Expected served models:

- `qwen2.5:7b`
- `qwen3-embedding:0.6b`

Verify the OpenAI-compatible endpoint returns `200` for `/v1/models`.

## 2. Backend environment

Keep secrets only in the root `.env`.

For the local hackathon demo:

```env
ENVIRONMENT=development
AUTH_MODE=development
KNOWLEDGE_PROVIDER=questoriaa
MODEL_PROVIDER=openai
MODEL_BASE_URL=<current tunnel>/v1
MODEL_NAME=qwen2.5:7b
MODEL_API_KEY=ollama
MODEL_TIMEOUT_SECONDS=60
MODEL_MAX_ATTEMPTS=2
EMBEDDING_PROVIDER=openai
EMBEDDING_BASE_URL=<current tunnel>/v1
EMBEDDING_MODEL=qwen3-embedding:0.6b
EMBEDDING_API_KEY=ollama
LEARNING__MODEL_TIMEOUT_SECONDS=60
```

`DATABASE_URL` must point to the prepared PostgreSQL schema at migration `0002`. `EMBEDDING_DIMENSION=1024` is required by the embedding contract. Do not apply migrations blindly to live Neon. If Qwen needs more time, raise both `MODEL_TIMEOUT_SECONDS` and `LEARNING__MODEL_TIMEOUT_SECONDS` together, up to 120 seconds for the latter.

## 3. Frontend environment

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your Clerk publishable key>
CLERK_SECRET_KEY=<your Clerk secret key>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Never commit real keys.

## 4. Start the stack

Terminal 1:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir backend --port 8000
```

Terminal 2:

```powershell
$env:PYTHONPATH = (Resolve-Path .\backend).Path
.\.venv\Scripts\python.exe -m app.workers.processing --poll
```

Terminal 3:

```powershell
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

Run `.\.venv\Scripts\python.exe backend/scripts/model_smoke.py` before the demo; unavailable models are a blocker, not a reason to switch silently to mocks. The final completion checks found the real text/embedding endpoints unavailable, while the database was reachable and at `0002`.

For the same-origin Railway-style path locally, set `NEXT_PUBLIC_API_BASE_URL=/backend-api` and `BACKEND_INTERNAL_URL=http://127.0.0.1:8000` in the frontend process before `npm run build`; then `npm run start`. Leave existing secret files untouched. Deployment settings and variable names are in [Railway setup](railway.md).

## 5. Critical validation order

1. Landing page renders.
2. Clerk sign-in works.
3. Dashboard renders and live course section reaches FastAPI.
4. Create a course.
5. Upload a small text-based PDF or PPTX.
6. Processing reaches completed.
7. Course map contains material-derived chapters/topics/concepts.
8. Open a concept and generate an adaptive challenge.
9. Submit an answer; confirm mastery-before/mastery-after and XP.
10. Ask Aria a question; confirm the answer contains backend-returned source citations.

If one optional/static dashboard widget is imperfect, do not block submission on it.

## 6. Truthful demo language

Current live ingestion: PDF/PPTX selectable text.

Do not claim OCR, image understanding, audio, or video ingestion is implemented.

Do not claim backend Clerk JWT verification is complete. Clerk protects the frontend application; local FastAPI demo auth uses the fixed development identity.

Community, Achievements, Settings, and some dashboard metrics are presentation/demo UI. The live course flow, challenge grading, mastery, XP, and tutor citations are backend-owned.
