#!/bin/bash

# Script to fix the trend_id column issue in the database

echo "Fixing trend_validations table column naming issue..."
echo "This will rename 'trend_id' to 'trend_submission_id' to match what the application expects"
echo ""

# You need to set these environment variables or replace them with your actual values
# Example: export SUPABASE_DB_URL="postgresql://user:password@host:port/database"

if [ -z "$SUPABASE_DB_URL" ]; then
    echo "Please set SUPABASE_DB_URL environment variable"
    echo "Example: export SUPABASE_DB_URL='postgresql://user:password@host:port/database'"
    exit 1
fi

# Run the fix
psql "$SUPABASE_DB_URL" -f FIX_TREND_ID_COLUMN.sql

echo ""
echo "Fix completed. Please test the verify page now."