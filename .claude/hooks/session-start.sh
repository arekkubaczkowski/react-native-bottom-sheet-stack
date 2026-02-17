#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "Installing dependencies..."
yarn install

echo "Running react-doctor diagnostics..."
npx -y react-doctor@latest . --verbose || true

echo "Session setup complete."
