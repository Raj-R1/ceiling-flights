#!/usr/bin/env bash
set -euo pipefail

required=(node pnpm)
for cmd in "${required[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd"
    exit 1
  fi
done

echo "Node: $(node -v)"
echo "pnpm: $(pnpm -v)"
echo "Environment looks good."
