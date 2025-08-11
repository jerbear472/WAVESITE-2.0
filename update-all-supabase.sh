#!/bin/bash

echo "🔄 Updating all Supabase references to new instance..."

# Old values
OLD_URL="aicahushpcslwjwrlqbo"
OLD_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w"

# New values
NEW_URL="aicahushpcslwjwrlqbo"
NEW_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w"

# Find and replace in all files
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.env*" -o -name "*.yaml" -o -name "*.yml" -o -name "*.sh" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/.git/*" \
  -exec grep -l "$OLD_URL" {} \; | while read file; do
    echo "Updating: $file"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|$OLD_URL|$NEW_URL|g" "$file"
        sed -i '' "s|$OLD_ANON_KEY|$NEW_ANON_KEY|g" "$file"
    else
        # Linux
        sed -i "s|$OLD_URL|$NEW_URL|g" "$file"
        sed -i "s|$OLD_ANON_KEY|$NEW_ANON_KEY|g" "$file"
    fi
done

echo "✅ All files updated!"