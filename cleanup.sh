#!/bin/bash

echo "🧹 WaveSight Cleanup Script"
echo "=========================="
echo ""

# Kill all Next.js and Node processes
echo "1. Stopping all Next.js processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Kill processes on common ports
echo "2. Clearing ports 3000-3005..."
for port in 3000 3001 3002 3003 3004 3005; do
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# Clear Next.js cache
echo "3. Clearing Next.js cache..."
cd web 2>/dev/null || cd /Users/JeremyUys_1/Desktop/WaveSight/web
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# Clear browser localStorage (instructions)
echo "4. Browser cleanup instructions:"
echo "   - Open Chrome DevTools (F12)"
echo "   - Go to Application tab"
echo "   - Clear Local Storage for localhost"
echo "   - Clear Session Storage for localhost"
echo "   - Clear Cookies for localhost"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "To start fresh:"
echo "  cd web && npm run dev"
echo ""
echo "The app will run on http://localhost:3000"
echo "(or the next available port if 3000 is in use)"