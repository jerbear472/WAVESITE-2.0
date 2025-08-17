#!/bin/bash

echo "🔧 Applying database cleanup for '0' and '00' values..."
echo "=================================================="

# Load environment variables
source web/.env.local

# Extract database connection details
DB_URL="${NEXT_PUBLIC_SUPABASE_URL}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-your_db_password_here}"

# Run the SQL script against Supabase
echo "Running cleanup script..."

# You can run this using Supabase CLI
cd web && npx supabase db push < ../FIX_ZERO_VALUES.sql

echo ""
echo "✅ Database cleanup complete!"
echo "Please refresh your dashboard to see the changes."