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

`EMBEDDING_DIMENSION=1024` is accepted on the frontend-integration branch after the config parsing fix.

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
.\.venv\Scripts\python.exe -m app.workers.processing --poll
```

Terminal 3:

```powershell
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

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
