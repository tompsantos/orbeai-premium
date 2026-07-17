#!/usr/bin/env bash
set -euo pipefail

if ! command -v bun >/dev/null 2>&1; then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
fi

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

echo "Installing dependencies..."
bun install

echo "Running typecheck..."
bun run typecheck

echo "orbeAI Codespace ready. Start the preview with: bun dev --host 0.0.0.0"
