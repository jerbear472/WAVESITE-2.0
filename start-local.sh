#!/bin/bash

echo "🚀 Starting WaveSight Local Development"
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Start backend
echo -e "\n${YELLOW}Starting Backend API...${NC}"
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start backend in background
python app/main.py &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started on http://localhost:8000${NC}"
echo -e "${BLUE}  API Docs: http://localhost:8000/docs${NC}"

# Start frontend
echo -e "\n${YELLOW}Starting Frontend...${NC}"
cd ../web

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend
echo -e "${GREEN}✓ Starting frontend on http://localhost:3000${NC}"
npm run dev &
FRONTEND_PID=$!

# Function to kill both processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set up trap to catch Ctrl+C
trap cleanup INT

echo -e "\n${GREEN}🎉 WaveSight is running!${NC}"
echo -e "\nFrontend: ${BLUE}http://localhost:3000${NC}"
echo -e "Backend API: ${BLUE}http://localhost:8000/docs${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Wait for processes
wait