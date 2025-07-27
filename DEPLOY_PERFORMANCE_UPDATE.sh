#!/bin/bash

# Deploy Performance-Based Payment Update Script

echo "🚀 Deploying WaveSight Performance-Based Payment Update..."

# 1. Run database migration
echo "📊 Running database migration..."
cd /Users/JeremyUys_1/Desktop/WAVESITE2

# Note: Update these credentials with your actual database info
# psql -U your_user -d your_database -f supabase/migrations/20240301_performance_based_payments.sql

echo "⚠️  Please run the following command with your database credentials:"
echo "psql -U your_user -d your_database -f supabase/migrations/20240301_performance_based_payments.sql"
echo ""

# 2. Start backend server
echo "🔧 Starting backend server..."
cd backend
# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
echo "Starting FastAPI server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "✅ Backend server started on http://localhost:8000"
echo "📚 API documentation available at http://localhost:8000/docs"

# 3. Start mobile app
echo "📱 Starting mobile app..."
cd ../mobile

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing mobile app dependencies..."
    npm install
fi

# For iOS
echo ""
echo "To run the iOS app:"
echo "cd mobile && npx react-native run-ios"

# For Android
echo ""
echo "To run the Android app:"
echo "cd mobile && npx react-native run-android"

echo ""
echo "✨ Performance-based payment system is now live!"
echo ""
echo "Key Changes:"
echo "- Removed time-based scroll payments"
echo "- Added quality-based trend rewards ($0.25-$5 per trend)"
echo "- New achievement system with bonus rewards"
echo "- Performance dashboard at /performance/stats"
echo "- Earnings breakdown at /performance/earnings"
echo ""
echo "Press Ctrl+C to stop the backend server"

# Wait for interrupt
wait $BACKEND_PID