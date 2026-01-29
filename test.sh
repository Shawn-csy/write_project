#!/bin/bash
set -e

echo "🚀 Starting Full Test Suite..."

# Frontend Tests
echo ""
echo "--- Running Frontend Tests (Vitest) ---"
npx vitest run

# Backend Tests
echo ""
echo "--- Running Backend Tests (Pytest) ---"
if [ -f "./server/run_tests.sh" ]; then
    bash ./server/run_tests.sh
else
    echo "⚠️ Backend test script not found at ./server/run_tests.sh"
fi

echo ""
echo "✅ All tests completed successfully!"
