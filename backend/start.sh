#!/bin/sh
set -eu

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
