#!/bin/bash

echo "Building WaveSite Desktop Application..."

# Navigate to desktop directory
cd "$(dirname "$0")"

# Install dependencies if needed
echo "Installing desktop dependencies..."
npm install

# Build the web app first (production build)
echo "Building web application..."
cd ../web
npm install
npm run build

# Go back to desktop directory
cd ../desktop

# Start the Electron app in development mode
echo "Starting Electron app..."
npm start