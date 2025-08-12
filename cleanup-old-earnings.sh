#!/bin/bash

# =====================================================
# CLEANUP OLD EARNINGS FILES
# This removes all old earnings logic to prevent conflicts
# =====================================================

echo "🧹 Cleaning up old earnings files..."

# Backup directory
BACKUP_DIR="./earnings_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup in $BACKUP_DIR"

# Files to remove (old earnings logic)
OLD_FILES=(
    "web/lib/earningsConfig.ts"
    "web/lib/EARNINGS_STANDARD.ts"
    "web/lib/EARNINGS_STANDARD_V2.ts"
    "web/lib/UNIFIED_EARNINGS_CONFIG.ts"
    "web/lib/REVISED_EARNINGS_CONFIG.ts"
    "web/services/ReliableTrendSubmission.ts"
    "web/services/ReliableTrendSubmissionV2.ts"
    "web/services/ReliableValidationService.ts"
    "web/services/UnifiedTrendSubmission.ts"
    "web/services/UnifiedValidationService.ts"
    "backend/app/config/earnings_standard.py"
    "UNIFIED_EARNINGS_SYSTEM.sql"
    "REVISED_EARNINGS_SYSTEM.sql"
    "EARNINGS_INCONSISTENCIES_REPORT.md"
    "EARNINGS_STANDARD_DOCUMENTATION.md"
    "EARNINGS_SYSTEM_DOCUMENTATION.md"
    "EARNINGS_DISPLAY_STANDARD.md"
    "EARNINGS_IMPLEMENTATION_CHECKLIST.md"
)

# Move old files to backup
for file in "${OLD_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  Moving $file to backup..."
        cp "$file" "$BACKUP_DIR/" 2>/dev/null
        rm "$file"
    fi
done

echo "✅ Old files backed up and removed"

# Files to keep and update
echo ""
echo "📝 Files to update:"
echo "  1. FINAL_UNIFIED_EARNINGS.sql - Run in Supabase"
echo "  2. web/lib/earnings.ts - The ONLY earnings config"
echo "  3. web/services/TrendSubmission.ts - New unified service"
echo ""

echo "🔍 Checking for imports of old files..."

# Find and report files still importing old earnings logic
grep -r "earningsConfig\|EARNINGS_STANDARD\|UNIFIED_EARNINGS\|REVISED_EARNINGS\|ReliableTrend\|UnifiedTrend" web/ \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude="earnings.ts" | head -20

echo ""
echo "⚠️  Update any files above to import from '@/lib/earnings' instead"
echo ""
echo "✅ Cleanup complete! Old earnings logic has been removed."
echo "📦 Backup saved to: $BACKUP_DIR"