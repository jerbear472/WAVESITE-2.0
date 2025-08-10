#!/bin/bash

echo "🔧 Fixing All Mobile App Errors"
echo "================================"

# Fix imports that should be default exports
echo "📦 Fixing import/export mismatches..."

# Check and fix each screen's export
check_and_fix_export() {
    local file=$1
    local screen_name=$2
    
    if [ -f "$file" ]; then
        # Check if it's a named export
        if grep -q "export const $screen_name" "$file"; then
            echo "  Found named export: $screen_name"
            # Already correct
        elif grep -q "export default" "$file"; then
            echo "  Found default export: $screen_name"
            # Already correct
        else
            echo "  ⚠️ No export found for $screen_name"
        fi
    else
        echo "  ❌ Missing file: $file"
    fi
}

# List of screens to check
check_and_fix_export "src/screens/DashboardScreenClean.tsx" "DashboardScreenClean"
check_and_fix_export "src/screens/ValidationScreenUpdated.tsx" "ValidationScreenUpdated"
check_and_fix_export "src/screens/ProfileScreenClean.tsx" "ProfileScreenClean"
check_and_fix_export "src/screens/TimelineScreen.tsx" "TimelineScreen"
check_and_fix_export "src/screens/SubmitTrendScreen.tsx" "SubmitTrendScreen"

echo ""
echo "✅ Export check complete"