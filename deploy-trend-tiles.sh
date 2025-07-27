#!/bin/bash

echo "🚀 Deploying Trend Tiles Feature..."

# Check if we have database credentials
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable not set"
    echo "Please set it to your Supabase database URL"
    exit 1
fi

# Step 1: Apply database migrations
echo "📊 Applying database migrations..."
psql "$DATABASE_URL" -f supabase/create_trend_tiles_schema.sql
if [ $? -eq 0 ]; then
    echo "✅ Database schema created successfully"
else
    echo "❌ Failed to create database schema"
    exit 1
fi

# Step 2: Install dependencies and build frontend
echo "📦 Installing frontend dependencies..."
cd web
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

echo "🔨 Building frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build frontend"
    exit 1
fi
cd ..

# Step 3: Build and deploy backend
echo "🐍 Building backend Docker image..."
cd backend
docker build -t wavesite-backend:latest .
if [ $? -ne 0 ]; then
    echo "❌ Failed to build backend Docker image"
    exit 1
fi
cd ..

# Step 4: Deploy using docker-compose
echo "🐳 Starting services with docker-compose..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "❌ Failed to start services"
    exit 1
fi

echo "✅ Deployment complete!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "🎯 New features available:"
echo "   - Trend Tiles at /trends"
echo "   - API endpoints at /api/v1/trend-tiles"
echo ""
echo "💡 Next steps:"
echo "   1. Visit http://localhost:3000/trends to see the new Trend Tiles feature"
echo "   2. Start organizing your content into trend folders"
echo "   3. Use the AI suggestions to auto-cluster related content"