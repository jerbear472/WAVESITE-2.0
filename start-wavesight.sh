#!/bin/bash

# Start WaveSight Dashboard Script
echo "🌊 Starting WaveSight Dashboard..."

# Kill any existing Next.js processes
pkill -f "next dev" 2>/dev/null

# Clear Next.js cache to ensure fresh build
cd "$(dirname "$0")/web"
rm -rf .next 2>/dev/null

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🚀 Starting server on http://localhost:3000"
npm run dev