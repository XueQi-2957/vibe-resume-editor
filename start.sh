#!/bin/bash
cd "$(dirname "$0")" || exit 1
echo "[VibeResume] Starting resume editor..."
echo ""
python -u serve.py 4173 &
SERVER_PID=$!
sleep 3
cmd //c start http://127.0.0.1:4173/editor.html 2>/dev/null || \
echo "Open manually: http://127.0.0.1:4173/editor.html"
echo ""
echo "Editor: http://127.0.0.1:4173/editor.html"
echo "Press Ctrl+C to stop the service."
trap "kill $SERVER_PID 2>/dev/null" EXIT
wait
