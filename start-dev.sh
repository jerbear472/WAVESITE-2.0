#!/bin/bash

echo "Starting WaveSite 2.0 Development Environment..."

# Function to check if port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Start backend in new terminal tab
echo "Starting backend server..."
if check_port 8000; then
    echo "Port 8000 is already in use. Backend might be running."
else
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend\" && ./start.sh"'
fi

# Wait a bit for backend to start
sleep 3

# Start frontend in new terminal tab
echo "Starting frontend development server..."
if check_port 3000; then
    echo "Port 3000 is already in use. Frontend might be running."
else
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/web\" && npm install && npm run dev"'
fi

echo ""
echo "🌊 WaveSite 2.0 is starting up!"
echo ""
echo "Backend API: http://localhost:8000"
echo "Backend Docs: http://localhost:8000/docs"
echo "Frontend: http://localhost:3000"
echo ""
echo "To stop all services, close the Terminal windows or press Ctrl+C in each."