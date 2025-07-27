#!/bin/bash

echo "🚀 Starting WaveSight Web App..."
echo ""
echo "Server will be available at: http://localhost:3001"
echo ""

# Function to handle script termination
cleanup() {
    echo ""
    echo "Stopping server..."
    kill $SERVER_PID 2>/dev/null
    exit 0
}

# Set up trap to catch script termination
trap cleanup EXIT INT TERM

# Start the server in background
PORT=3001 npm run dev &
SERVER_PID=$!

echo "✅ Server started with PID: $SERVER_PID"
echo ""
echo "To stop the server, press Ctrl+C"
echo ""

# Keep the script running
while true; do
    # Check if server is still running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "Server stopped unexpectedly. Restarting..."
        PORT=3001 npm run dev &
        SERVER_PID=$!
        echo "Server restarted with PID: $SERVER_PID"
    fi
    sleep 5
done