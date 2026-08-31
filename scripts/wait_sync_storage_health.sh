#!/usr/bin/env bash
# Wait until sync-storage responds on /health (used in CI before running adapters).
set -euo pipefail

PORT="${1:?port required}"
LOG_FILE="${2:-service.log}"
MAX_ATTEMPTS="${3:-30}"

for ((i = 1; i <= MAX_ATTEMPTS; i++)); do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    echo "sync-storage is healthy on port ${PORT} (attempt ${i}/${MAX_ATTEMPTS})"
    exit 0
  fi
  sleep 1
done

echo "sync-storage did not become healthy on port ${PORT} after ${MAX_ATTEMPTS}s"
if [ -f "$LOG_FILE" ]; then
  echo "--- ${LOG_FILE} ---"
  cat "$LOG_FILE"
fi
exit 1
