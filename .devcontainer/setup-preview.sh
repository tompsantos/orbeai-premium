#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "=== preparando preview seguro da orbeAI ==="
echo "modo: mock local, sem banco e sem provedores reais"

npm --prefix apps/web install --no-audit --no-fund
npm --prefix apps/web run typecheck

echo "preview preparado com sucesso"
