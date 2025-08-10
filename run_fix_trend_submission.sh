#!/bin/bash

echo "===========================================" 
echo "Fixing Trend Submission Database Columns"
echo "==========================================="
echo ""
echo "This script will ensure all required columns exist in the trend_submissions table"
echo "to fix the mismatch between the web app and database schema."
echo ""

# Check if the SQL file exists
if [ ! -f "FIX_TREND_SUBMISSION_COLUMNS.sql" ]; then
    echo "❌ Error: FIX_TREND_SUBMISSION_COLUMNS.sql not found!"
    echo "Please ensure the SQL file is in the current directory."
    exit 1
fi

echo "📋 SQL file found. The script will:"
echo "  1. Add missing columns if they don't exist"
echo "  2. Create necessary indexes"
echo "  3. Show the final table structure"
echo ""

read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Operation cancelled."
    exit 0
fi

echo ""
echo "🔧 Please run the following SQL in your Supabase SQL Editor:"
echo "==========================================="
echo ""
cat FIX_TREND_SUBMISSION_COLUMNS.sql
echo ""
echo "==========================================="
echo ""
echo "📝 After running the SQL:"
echo "  1. Check the output for any errors"
echo "  2. Verify all columns were added successfully"
echo "  3. Test the trend submission form in your web app"
echo ""
echo "✅ The JavaScript/TypeScript files have already been fixed to:"
echo "  - Remove explicit created_at settings (handled by database)"
echo "  - Ensure all column names match the database schema"
echo ""
echo "🎯 Next steps:"
echo "  1. Copy and run the SQL above in Supabase"
echo "  2. Restart your web app if needed"
echo "  3. Test submitting a new trend"
echo ""