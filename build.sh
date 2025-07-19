#!/bin/bash
set -e

echo "Starting build process..."

# Navigate to web directory
cd web

# Clean install dependencies
echo "Installing dependencies..."
npm ci || npm install

# Build the application
echo "Building Next.js app..."
npm run build

echo "Build complete!"