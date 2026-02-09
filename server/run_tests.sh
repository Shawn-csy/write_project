#!/bin/bash
set -e

# Define directory of tests
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$TEST_DIR"

echo "=== Backend Testing Suite ==="

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing dependencies..."
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Run tests
echo "Running Pytest..."
PYTHONPATH=. pytest tests

echo "✅ All tests passed!"
