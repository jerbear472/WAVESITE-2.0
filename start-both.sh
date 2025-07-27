#!/bin/bash

# Start backend in background
echo "Starting backend API..."
cd backend
source venv/bin/activate
python performance_server.py &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 2

# Keep web running if already started
echo ""
echo "✅ Services running:"
echo "   Backend API: http://localhost:8000"
echo "   Frontend: http://localhost:3001"
echo ""
echo "To access the app:"
echo "1. Go to http://localhost:3001/login"
echo "2. Use any credentials to login (mock auth)"
echo "3. Navigate to http://localhost:3001/earnings to see the cash out feature"
echo ""
echo "Press Ctrl+C to stop the backend"

# Wait for backend process
wait $BACKEND_PID