#!/bin/bash

echo "🚀 WaveSight Startup Script"
echo "==========================="
echo ""

# First run cleanup
echo "Running cleanup first..."
./cleanup.sh

echo ""
echo "Starting WaveSight..."
echo ""

# Find available port
PORT=3000
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; do
    echo "Port $PORT is in use, trying next..."
    PORT=$((PORT + 1))
done

echo "✅ Using port: $PORT"
echo ""

# Start the app
cd web
echo "Starting Next.js on http://localhost:$PORT"
echo ""
PORT=$PORT npm run dev