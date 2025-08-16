#!/bin/bash

# WaveSight Local Development Startup Script
echo "🚀 Starting WaveSight Local Development Environment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.9+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites found${NC}"

# Install Web App Dependencies
echo -e "\n${YELLOW}📦 Installing Web App dependencies...${NC}"
cd web
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "Dependencies already installed. Run 'npm install' to update."
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local not found in web directory${NC}"
    echo "Creating from example..."
    cp .env.local.example .env.local
    echo -e "${YELLOW}Please update .env.local with your Supabase credentials${NC}"
fi

# Install Backend Dependencies
echo -e "\n${YELLOW}🐍 Setting up Python Backend...${NC}"
cd ../backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt --quiet

# Create .env file for backend if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating backend .env file...${NC}"
    cat > .env << EOF
# Backend Environment Variables
DATABASE_URL=postgresql://user:password@localhost/wavesight
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here
SUPABASE_URL=https://aicahushpcslwjwrlqbo.supabase.co
SUPABASE_KEY=your-service-role-key-here
EOF
    echo -e "${YELLOW}Please update backend/.env with your credentials${NC}"
fi

# Start services
echo -e "\n${GREEN}🎯 Starting services...${NC}"
echo "=================================================="

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start backend server
echo -e "${YELLOW}Starting Backend API (port 8000)...${NC}"
cd ../backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo -e "${YELLOW}Starting Frontend (port 3000)...${NC}"
cd ../web
npm run dev &
FRONTEND_PID=$!

# Display status
echo -e "\n${GREEN}✅ WaveSight is running!${NC}"
echo "=================================================="
echo -e "📱 Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "🔧 Backend API: ${GREEN}http://localhost:8000${NC}"
echo -e "📚 API Docs: ${GREEN}http://localhost:8000/docs${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"
echo "=================================================="

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID