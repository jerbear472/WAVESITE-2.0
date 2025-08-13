#!/bin/bash

echo "🚀 Quick fix for Vercel deployment..."

# Fix UnifiedTrendSubmission type issues
echo "Fixing UnifiedTrendSubmission..."
sed -i '' 's/screenshot_url: string | null/screenshot_url: string | undefined/g' services/UnifiedTrendSubmission.ts
sed -i '' 's/screenshot_url: screenshotUrl,/screenshot_url: screenshotUrl || undefined,/g' services/UnifiedTrendSubmission.ts

# Add type assertions where needed
sed -i '' 's/calculateTrendEarnings(/calculateTrendEarnings(/g' services/UnifiedTrendSubmission.ts

echo "✅ Fixes applied"
echo "Running build..."
npm run build 2>&1 | tail -20