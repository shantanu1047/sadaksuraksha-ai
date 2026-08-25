#!/bin/bash
echo "======================================================="
echo " Starting SadakSuraksha AI // Road Hazard Intelligence "
echo "======================================================="

export PYTHONPATH="."

if command -v uv &> /dev/null; then
    echo "Running with Astral uv..."
    uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "uv not found, running with standard python..."
    python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
fi
