#!/bin/bash

echo "Fixing TypeScript errors for Vercel deployment..."

# Fix login page searchParams null checks
echo "Fixing login/page.tsx..."
sed -i '' "s/searchParams\.get/searchParams?.get/g" app/login/page.tsx

# Fix EnterpriseViewSwitcher pathname null check
echo "Fixing EnterpriseViewSwitcher.tsx..."
sed -i '' "s/pathname\.startsWith/pathname?.startsWith/g" components/EnterpriseViewSwitcher.tsx

# Fix viewport.ts - comment out missing import
echo "Fixing viewport.ts..."
sed -i '' "s/import smoothscroll/\/\/ import smoothscroll/g" lib/viewport.ts

# Fix simpleThumbnailExtractor.ts null type
echo "Fixing simpleThumbnailExtractor.tsx..."
sed -i '' "s/: string | null/: string | undefined/g" lib/simpleThumbnailExtractor.ts

echo "TypeScript fixes applied. Running build to check..."
npm run build