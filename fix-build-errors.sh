#!/bin/bash

echo "Fixing build errors from XP migration..."

# Fix scroll/page.tsx - Remove EarningsAnimation import and usage
echo "Fixing scroll/page.tsx..."
sed -i '' "/import.*EarningsAnimation/d" web/app/\(authenticated\)/scroll/page.tsx
sed -i '' "s/const { earningsAnimation, triggerEarningsAnimation } = useEarningsAnimation();//g" web/app/\(authenticated\)/scroll/page.tsx
sed -i '' "/<EarningsAnimation/,/\/>/d" web/app/\(authenticated\)/scroll/page.tsx
sed -i '' "s/triggerEarningsAnimation([^)]*);*//g" web/app/\(authenticated\)/scroll/page.tsx

# Fix timeline/page.tsx - Remove EarningsToast import and usage
echo "Fixing timeline/page.tsx..."
sed -i '' "/import.*EarningsToast/d" web/app/\(authenticated\)/timeline/page.tsx
sed -i '' "/<EarningsToast/,/\/>/d" web/app/\(authenticated\)/timeline/page.tsx

# Fix validate/page.tsx - Replace XPNotification with XPDisplay
echo "Fixing validate/page.tsx..."
sed -i '' "s/import.*XPNotification.*/import XPDisplay from '@\/components\/XPDisplay';/g" web/app/\(authenticated\)/validate/page.tsx
sed -i '' "s/<XPNotification/<XPDisplay/g" web/app/\(authenticated\)/validate/page.tsx
sed -i '' "s/<\/XPNotification>/<\/XPDisplay>/g" web/app/\(authenticated\)/validate/page.tsx

# Fix SmartTrendSubmission.tsx - Remove EarningsNotification import
echo "Fixing SmartTrendSubmission.tsx..."
sed -i '' "/import.*EarningsNotification/d" web/components/SmartTrendSubmission.tsx
sed -i '' "/<EarningsNotification/,/\/>/d" web/components/SmartTrendSubmission.tsx

echo "Build errors fixed!"