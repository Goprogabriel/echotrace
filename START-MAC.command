#!/bin/bash
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  node scripts/serve.mjs --open
elif command -v python3 >/dev/null 2>&1; then
  python3 scripts/serve.py --open
else
  echo "Install Node.js (18+) or Python 3, then open this file again."
  echo "You can also put the dist folder on a static website host."
  read -r -p "Press Enter to close."
fi
