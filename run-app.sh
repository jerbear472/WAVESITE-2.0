#!/bin/bash

echo "Starting WAVESITE2..."

# Start backend
cd /Users/JeremyUys_1/Desktop/WAVESITE2/backend
source venv/bin/activate
python performance_server.py &
BACKEND_PID=$!
echo "✓ Backend started on http://localhost:8001"

# Start frontend
cd /Users/JeremyUys_1/Desktop/WAVESITE2/web
npm run dev &
FRONTEND_PID=$!

sleep 3

echo ""
echo "✅ WAVESITE2 is running!"
echo ""
echo "Frontend: http://localhost:3001"
echo "Backend API: http://localhost:8001"
echo ""
echo "To login: Use ANY email/password (e.g., test@example.com / password)"
echo "Cash out feature: http://localhost:3001/earnings"
echo ""
echo "Press Ctrl+C to stop"

# Trap ctrl+c
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Wait
wait