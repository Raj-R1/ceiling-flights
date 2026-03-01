#!/usr/bin/env bash
set -euo pipefail

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install from https://brew.sh and rerun."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node via Homebrew..."
  brew install node
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@10.6.4 --activate
elif ! command -v pnpm >/dev/null 2>&1; then
  echo "Installing pnpm globally via npm..."
  npm install -g pnpm@10.6.4
fi

pnpm install --ignore-scripts=false
pnpm rebuild esbuild electron
bash ./scripts/verify-env.sh

echo "Setup complete. Run: pnpm dev"
