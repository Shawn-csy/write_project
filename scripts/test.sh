#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚀 Starting Full Test Suite..."

# Frontend Tests
echo ""
echo "--- Running Frontend Tests (Vitest) ---"
npm test

# Backend Tests
echo ""
echo "--- Running Backend Tests (Pytest) ---"
if [ -f "./server/run_tests.sh" ]; then
    bash ./server/run_tests.sh
else
    if [ -x "./server/venv/bin/python" ]; then
        (cd server && ./venv/bin/python -m pytest -q)
    else
        echo "⚠️ Backend venv not found; run: python -m pip install -r server/requirements.txt"
        exit 1
    fi
fi

echo ""
echo "✅ All tests completed successfully!"
