#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if command -v node >/dev/null 2>&1; then
  node scripts/serve.mjs --open
elif command -v python3 >/dev/null 2>&1; then
  python3 scripts/serve.py --open
else
  echo "Install Node.js 18+ or Python 3, or host dist/ on a static website host."
  exit 1
fi
