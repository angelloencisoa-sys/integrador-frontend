#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  exec node server.mjs
elif command -v python3 >/dev/null 2>&1; then
  exec python3 server.py
else
  echo "Necesitas Node.js o Python 3 para iniciar el servidor HTTP local en http://127.0.0.1:4200."
  exit 1
fi
