#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
LOG_FILE="/tmp/orbeai-preview.log"
PID_FILE="/tmp/orbeai-preview.pid"
URL="http://127.0.0.1:8080"

if curl -fsS "$URL" >/dev/null 2>&1; then
  echo "orbeAI preview já está ativo em $URL"
  exit 0
fi

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

cd "$ROOT"
: > "$LOG_FILE"

VITE_MOCK_MODE=true VITE_API_BASE_URL="" \
  nohup npm --prefix apps/web run dev -- --host 0.0.0.0 --port 8080 \
  >"$LOG_FILE" 2>&1 &

PREVIEW_PID=$!
echo "$PREVIEW_PID" > "$PID_FILE"

for _ in $(seq 1 90); do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    echo "orbeAI premium pronta em $URL"
    echo "log: $LOG_FILE"
    exit 0
  fi

  if ! kill -0 "$PREVIEW_PID" 2>/dev/null; then
    echo "erro: o preview encerrou antes de ficar pronto"
    cat "$LOG_FILE"
    exit 1
  fi

  sleep 1
done

echo "erro: o preview não respondeu dentro da janela de inicialização"
cat "$LOG_FILE"
exit 1
