#!/bin/bash

echo "Installing dependencies for XP-based system with Google Trends integration..."

cd web

# Install Google Trends API package
npm install google-trends-api

# Install chart.js for trend visualization
npm install chart.js react-chartjs-2

# Install date utilities
npm install date-fns

echo "Dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Run the database migration: psql -d your_database -f supabase/migrations/convert_to_xp_system.sql"
echo "2. Run the trend fields migration: psql -d your_database -f supabase/migrations/add_trend_submission_v2_fields.sql"
echo "3. Set up environment variables:"
echo "   - CRON_SECRET (for the verification endpoint)"
echo "   - NEXT_PUBLIC_SERPAPI_KEY (optional, for SerpAPI)"
echo "4. Set up a cron job to call /api/cron/verify-predictions daily"
echo "5. Test the new submission form at /submit-trend"
echo ""
echo "The app is now converted to a non-monetized XP-based platform!"