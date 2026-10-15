# Railway hackathon deployment

Deploy externally; this completion pass did not deploy or apply live migrations.

| Setting | questoriaa-web | questoriaa-api |
| --- | --- | --- |
| Root directory | `apps/web` | `backend` |
| Install/build | `npm ci` then `npm run build` | `pip install .` |
| Start | `npm run start` | `sh start.sh` |
| Health check | `/` | `/health` |
| Networking | Public HTTPS domain | Private only; no public domain/TCP proxy |
| Replicas | 1 for this demo | **1**, one Uvicorn process and one worker |
| Storage | None | Existing volume at `/data`; `LOCAL_STORAGE_PATH=/data/storage` |

`start.sh` runs `python -m alembic -c alembic.ini upgrade head` before starting either process and fails startup if migration fails. It then supervises both processes and stops the sibling if either exits. Configure restart on failure. It requires real endpoint configuration and rejects mock provider selection. Interrupted jobs still need explicit operator recovery. `/health` is liveness, not database/model readiness. Keep one API service replica so startup migrations are not run concurrently.

Set API `PORT=8000`. Set web `BACKEND_INTERNAL_URL=http://questoriaa-api.railway.internal:8000` and `NEXT_PUBLIC_API_BASE_URL=/backend-api` **before building**, and keep the internal URL available at runtime. Next rewrites are built into the routing manifest; rebuild after changing these values. If the API port changes, change the URL too. Private DNS is needed at runtime, not during compilation.

The script binds `0.0.0.0` for current Railway environments, which have private IPv4 and IPv6 addresses. Legacy IPv6-only environments require `API_HOST=::` and a connectivity/healthcheck test. See [Railway private-network DNS documentation](https://docs.railway.com/networking/private-networking/how-it-works).

## Authentication boundary

Clerk protects app routes and **all** `/backend-api/*` requests, including paths with file extensions. Unauthenticated gateway calls receive JSON 401. Do not expose development-auth FastAPI publicly.

Backend JWT verification remains unimplemented. For the controlled shared hackathon demo use `ENVIRONMENT=development`, `AUTH_MODE=development`; every Clerk user shares the same backend identity and courses. This is not production tenant isolation. `AUTH_MODE=clerk` intentionally fails closed. Configure the web domain in Clerk externally and verify sign-in there.

## Environment names

Web:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_API_BASE_URL`, `BACKEND_INTERNAL_URL`, Railway-provided `PORT`

API:

- `DATABASE_URL` (SQLAlchemy `postgresql+psycopg` URL with Neon TLS options)
- `ENVIRONMENT`, `AUTH_MODE`, optionally `DEV_USER_ID`
- `KNOWLEDGE_PROVIDER=questoriaa`, `MODEL_PROVIDER=openai`, `EMBEDDING_PROVIDER=openai`, `LEARNING_MODE=adaptive`
- `MODEL_BASE_URL`, `MODEL_NAME`, `MODEL_API_KEY` when required by the endpoint
- `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL`, `EMBEDDING_API_KEY` when required
- `MODEL_TIMEOUT_SECONDS`, `MODEL_MAX_ATTEMPTS`, `LEARNING__MODEL_TIMEOUT_SECONDS`
- `EMBEDDING_DIMENSION` (1024), `LOCAL_STORAGE_PATH`, `PORT`
- Optional `API_HOST`, `API_V1_PREFIX` (keep `/api/v1`), `CORS_ORIGINS` (JSON array for direct browser access)

Both inference base URLs must include `/v1`. Qwen2.5 7B and Qwen3 embeddings are separate capabilities; embeddings must return 1024 finite values. Keep both tunnel/model services alive. Set both model timeout settings consistently for slower inference (for example 120 seconds); learning timeout cannot exceed 120. Next's upstream timeout is 900 seconds to cover retrieval and multiple generation/verification calls.

Signed PUTs retain the API prefix through `/backend-api`, preserve the reserved Content-Type, and send raw bytes. Proxy buffering matches the backend's 100,000,000-byte limit. Large concurrent uploads consume memory; use a small selectable-text document for the demo. Signed URLs expire after 15 minutes or API restart and are process-local, hence one API process/replica.

## External final check

1. Restore the real text and embedding endpoints; run `backend/scripts/model_smoke.py` locally.
2. Startup now applies the existing migrations up to `0002`, as authorized for final deployment. This pass tested startup migration on isolated SQLite and only read the live Neon schema; it did not execute startup against Neon.
3. Configure service roots/build/start commands, private URL/port, volume and Clerk domain.
4. Deploy externally, then verify health, worker logs, login, upload, processing, assessment and citations.
5. Confirm unauthenticated `/backend-api/api/v1/courses` returns 401. Do not expose a public API domain.
