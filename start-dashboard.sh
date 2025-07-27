#!/bin/bash

echo "🚀 Starting WaveSight Enterprise Dashboard..."
echo ""

# Kill any existing processes on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Navigate to web directory
cd /Users/JeremyUys_1/Desktop/wavesite2/web

# Start the server
echo "📦 Starting development server on port 3001..."
echo ""
echo "✅ Server will be available at:"
echo "   http://localhost:3001"
echo ""
echo "📝 Login credentials:"
echo "   Email: enterprise@test.com"
echo "   Password: test123456"
echo ""
echo "🌐 Opening in browser in 5 seconds..."
echo ""

# Start the server
PORT=3001 npm run dev &

# Wait for server to start
sleep 5

# Open in default browser
open http://localhost:3001/login

echo ""
echo "✨ Dashboard is starting! Check your browser."
echo "Press Ctrl+C to stop the server."

# Keep script running
wait