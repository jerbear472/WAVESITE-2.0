#!/bin/bash

echo "==========================================="
echo "Fixing Verify Page Ambiguous Column Error"
echo "==========================================="
echo ""
echo "This script fixes the 'rejects column is ambiguous' error on the verify page."
echo ""

# Check if the SQL file exists
if [ ! -f "FIX_VERIFY_PAGE_AMBIGUOUS.sql" ]; then
    echo "❌ Error: FIX_VERIFY_PAGE_AMBIGUOUS.sql not found!"
    echo "Please ensure the SQL file is in the current directory."
    exit 1
fi

echo "📋 The fix includes:"
echo "  1. Recreating the cast_trend_vote function with explicit table aliases"
echo "  2. Creating a clean view for validation trends"
echo "  3. Updating TypeScript code to select specific columns"
echo ""

echo "✅ TypeScript Changes Already Applied:"
echo "  - Updated verify/page.tsx to select specific columns instead of *"
echo "  - This avoids any ambiguous column references"
echo ""

read -p "Do you want to continue and see the SQL to run? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Operation cancelled."
    exit 0
fi

echo ""
echo "🔧 Please run the following SQL in your Supabase SQL Editor:"
echo "==========================================="
echo ""
cat FIX_VERIFY_PAGE_AMBIGUOUS.sql
echo ""
echo "==========================================="
echo ""
echo "📝 After running the SQL:"
echo "  1. Check for any errors in the output"
echo "  2. The function should be recreated successfully"
echo "  3. Test the verify page - it should work without errors"
echo ""
echo "🎯 The fix addresses:"
echo "  - Ambiguous column references in SQL queries"
echo "  - Explicit table aliases in the cast_trend_vote function"
echo "  - TypeScript code now uses specific column selection"
echo ""
echo "✨ Your verify page should now work correctly!"
echo ""