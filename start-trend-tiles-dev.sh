#!/bin/bash

echo "🚀 Starting Trend Tiles Development Environment..."

# Start backend
echo "🐍 Starting backend server..."
cd backend
python -m venv venv 2>/dev/null || true
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null || true
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "📦 Starting frontend development server..."
cd web
npm install
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Development servers started!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "🎯 Visit http://localhost:3000/trends to see the Trend Tiles feature"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait