#!/bin/sh
# One API process (local upload signatures are process-local) and one DB worker.
# Schema upgrades are an explicit operator step; never migrate automatically.
set -eu
cd "$(dirname "$0")"
export PYTHONUNBUFFERED=1
: "${DATABASE_URL:?Set DATABASE_URL}"
: "${MODEL_BASE_URL:?Set MODEL_BASE_URL}"
: "${MODEL_NAME:?Set MODEL_NAME}"
: "${EMBEDDING_BASE_URL:?Set EMBEDDING_BASE_URL}"
: "${EMBEDDING_MODEL:?Set EMBEDDING_MODEL}"
export KNOWLEDGE_PROVIDER="${KNOWLEDGE_PROVIDER:-questoriaa}"
export MODEL_PROVIDER="${MODEL_PROVIDER:-openai}"
export EMBEDDING_PROVIDER="${EMBEDDING_PROVIDER:-openai}"
export LEARNING_MODE="${LEARNING_MODE:-adaptive}"
if [ "$KNOWLEDGE_PROVIDER" != questoriaa ] || [ "$MODEL_PROVIDER" != openai ] || [ "$EMBEDDING_PROVIDER" != openai ] || [ "$LEARNING_MODE" != adaptive ]; then
    echo "Railway startup requires real knowledge/model/embedding providers and adaptive learning." >&2
    exit 1
fi
export LOCAL_STORAGE_PATH="${LOCAL_STORAGE_PATH:-/data/storage}"
mkdir -p "$LOCAL_STORAGE_PATH"

worker_pid=""
api_pid=""
cleanup() {
    trap - EXIT INT TERM
    [ -z "$worker_pid" ] || kill "$worker_pid" 2>/dev/null || true
    [ -z "$api_pid" ] || kill "$api_pid" 2>/dev/null || true
    wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 0' INT TERM

python -m app.workers.processing --poll &
worker_pid=$!
python -m uvicorn app.main:app --host "${API_HOST:-0.0.0.0}" --port "${PORT:-8000}" --workers 1 --no-access-log &
api_pid=$!

# If either process dies, stop its sibling and let Railway restart the service.
while kill -0 "$worker_pid" 2>/dev/null && kill -0 "$api_pid" 2>/dev/null; do
    sleep 1
done
echo "API or processing worker exited; restarting the service is required." >&2
exit 1
