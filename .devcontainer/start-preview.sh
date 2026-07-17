#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
LOG_FILE="/tmp/orbeai-preview.log"
PID_FILE="/tmp/orbeai-preview.pid"
URL="http://127.0.0.1:8080"
HEALTH_URL="${URL}/app/chat"

preview_is_healthy() {
  curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1
}

if preview_is_healthy; then
  echo "orbeAI preview já está ativo em $HEALTH_URL"
  exit 0
fi

# Remove processos antigos que possam manter a porta aberta com uma build obsoleta.
if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
    kill -9 "$OLD_PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

pkill -f "vite.*--port 8080" 2>/dev/null || true
pkill -f "npm.*apps/web.*run dev" 2>/dev/null || true

if command -v fuser >/dev/null 2>&1; then
  fuser -k 8080/tcp >/dev/null 2>&1 || true
fi

cd "$ROOT"
: > "$LOG_FILE"

VITE_MOCK_MODE=true VITE_API_BASE_URL="" \
  nohup npm --prefix apps/web run dev -- --host 0.0.0.0 --port 8080 --strictPort \
  >"$LOG_FILE" 2>&1 &

PREVIEW_PID=$!
echo "$PREVIEW_PID" > "$PID_FILE"

for _ in $(seq 1 90); do
  if preview_is_healthy; then
    echo "orbeAI premium pronta em $HEALTH_URL"
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

echo "erro: o preview não respondeu em $HEALTH_URL dentro da janela de inicialização"
cat "$LOG_FILE"
exit 1
