#!/usr/bin/env bash
# Dev runner: starts the FastAPI backend (:8000) and the Vite dev server (:5173)
# together. Ctrl-C stops both. Assumes deps are already installed
# (backend/venv + frontend/node_modules).
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -x backend/venv/bin/uvicorn ]]; then
  echo "backend/venv missing — run: cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi
if [[ ! -d frontend/node_modules ]]; then
  echo "frontend/node_modules missing — run: cd frontend && npm install" >&2
  exit 1
fi

pids=()
cleanup() { kill "${pids[@]}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

( cd backend && exec ./venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 ) &
pids+=($!)

( cd frontend && exec npm run dev ) &
pids+=($!)

echo "backend → http://127.0.0.1:8000   frontend → http://localhost:5173"
wait
