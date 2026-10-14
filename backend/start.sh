#!/bin/sh
set -eu

# Railway demo fallback: real Neon/Qwen variables override these when present.
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="sqlite:////data/questoriaa.db"
fi

if [ -z "${MODEL_BASE_URL:-}" ]; then
  export MODEL_PROVIDER="mock"
  export KNOWLEDGE_PROVIDER="mock"
  export EMBEDDING_PROVIDER="mock"
fi

export ENVIRONMENT="${ENVIRONMENT:-development}"
export AUTH_MODE="${AUTH_MODE:-development}"
export LOCAL_STORAGE_PATH="${LOCAL_STORAGE_PATH:-/data}"

echo "[questoriaa] applying database migrations"
alembic -c alembic.ini upgrade head

echo "[questoriaa] starting processing worker"
python -m app.workers.processing --poll &
WORKER_PID=$!

shutdown() {
  kill "$WORKER_PID" 2>/dev/null || true
}
trap shutdown INT TERM EXIT

echo "[questoriaa] starting FastAPI on port ${PORT:-8000}"
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
STATUS=$?

shutdown
wait "$WORKER_PID" 2>/dev/null || true
exit "$STATUS"
