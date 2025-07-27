#!/bin/bash

echo "🚀 Starting WaveSite Application..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup INT TERM

# Start backend
echo "🐍 Starting backend server..."
echo "Note: Backend might have dependency issues with Python 3.13"
echo "If backend fails, frontend will still work with mock data"
echo ""

cd backend
if [ -d "venv" ]; then
    source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null || true
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 2>/dev/null &
    BACKEND_PID=$!
else
    echo "⚠️  No virtual environment found for backend"
    echo "   Backend will not start, but frontend will work with mock data"
    BACKEND_PID=0
fi
cd ..

# Start frontend
echo "📦 Starting frontend development server..."
cd web
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for services to start
sleep 3

echo ""
echo "✅ Application started!"
echo ""
echo "📱 Frontend: http://localhost:3000 (or http://localhost:3001 if 3000 is in use)"
echo "🔧 Backend API: http://localhost:8000 (if running)"
echo "📚 API Docs: http://localhost:8000/docs (if backend is running)"
echo ""
echo "🎯 Visit http://localhost:3000/trends to see the Trend Tiles feature"
echo ""
echo "✨ Features available:"
echo "   - Trend Tiles with folder organization"
echo "   - Drag-and-drop from unassigned pool"
echo "   - Timeline view (click the clock icon)"
echo "   - Grid/List/Timeline view toggle"
echo ""
echo "Press Ctrl+C to stop all servers"

# Keep script running
wait