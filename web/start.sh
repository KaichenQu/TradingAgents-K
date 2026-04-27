#!/bin/bash
# Start TradingAgents web UI
# Run from the project root: bash web/start.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting backend on http://localhost:8000 ..."
conda run -n tradingagents uvicorn web.backend.main:app --reload --port 8000 &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:5173 ..."
cd "$ROOT/web/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Open http://localhost:5173"
echo "Press Ctrl+C to stop both servers."
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
