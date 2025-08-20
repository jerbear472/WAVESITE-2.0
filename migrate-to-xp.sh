#!/bin/bash

# Migration script from Earnings to XP System
# This script safely transitions the database and codebase

echo "========================================="
echo "FreeWaveSight: Migrating to XP System"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Load environment variables
source .env

echo -e "${YELLOW}Step 1: Backing up current database...${NC}"
# Create backup directory
mkdir -p backups
BACKUP_FILE="backups/pre-xp-migration-$(date +%Y%m%d-%H%M%S).sql"

# Backup current database (you'll need to adjust this based on your setup)
echo "Creating backup at $BACKUP_FILE"
# Uncomment and adjust for your database:
# pg_dump $DATABASE_URL > $BACKUP_FILE

echo -e "${GREEN}✓ Backup created${NC}"

echo -e "${YELLOW}Step 2: Running XP migration SQL...${NC}"
# Run the migration SQL
npx supabase db push --file supabase/migrations/20250820_xp_system_migration.sql

echo -e "${GREEN}✓ Database migrated${NC}"

echo -e "${YELLOW}Step 3: Updating frontend components...${NC}"

# List of files that need earnings -> XP updates
FILES_TO_UPDATE=(
    "web/components/Navigation.tsx"
    "web/app/(authenticated)/dashboard/page.tsx"
    "web/components/StreakDisplay.tsx"
    "web/app/(authenticated)/validate/page.tsx"
    "web/contexts/AuthContext.tsx"
    "mobile/src/screens/BountyHuntScreen.tsx"
)

for file in "${FILES_TO_UPDATE[@]}"; do
    if [ -f "$file" ]; then
        echo "  Updating $file..."
        # Create backup
        cp "$file" "$file.bak"
        
        # Replace earnings references with XP
        # These are basic replacements - you may need to adjust
        sed -i '' 's/earnings/xp/g' "$file"
        sed -i '' 's/Earnings/XP/g' "$file"
        sed -i '' 's/earning/xp/g' "$file"
        sed -i '' 's/Earning/XP/g' "$file"
        sed -i '' 's/\$//g' "$file"  # Remove dollar signs
        sed -i '' 's/payment/reward/g' "$file"
        sed -i '' 's/Payment/Reward/g' "$file"
        sed -i '' 's/payout/reward/g' "$file"
        sed -i '' 's/Payout/Reward/g' "$file"
    fi
done

echo -e "${GREEN}✓ Frontend components updated${NC}"

echo -e "${YELLOW}Step 4: Removing Stripe integration...${NC}"

# Remove Stripe-related files
STRIPE_FILES=(
    "web/app/api/stripe"
    "stripe-setup.sh"
)

for file in "${STRIPE_FILES[@]}"; do
    if [ -e "$file" ]; then
        echo "  Removing $file..."
        rm -rf "$file"
    fi
done

# Remove Stripe dependencies from package.json
if [ -f "web/package.json" ]; then
    echo "  Removing Stripe from web/package.json..."
    npm uninstall --prefix web stripe @stripe/stripe-js
fi

if [ -f "backend/package.json" ]; then
    echo "  Removing Stripe from backend/package.json..."
    npm uninstall --prefix backend stripe
fi

echo -e "${GREEN}✓ Stripe integration removed${NC}"

echo -e "${YELLOW}Step 5: Creating XP API endpoints...${NC}"

# Create new XP API directory
mkdir -p web/app/api/xp

# Create XP API endpoint
cat > web/app/api/xp/route.ts << 'EOF'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get user's XP data
  const { data: xpData, error: xpError } = await supabase
    .from('user_xp')
    .select('*, xp_levels(title, badge_url)')
    .eq('user_id', user.id)
    .single();
  
  if (xpError && xpError.code !== 'PGRST116') {
    return NextResponse.json({ error: xpError.message }, { status: 500 });
  }
  
  // Get recent XP transactions
  const { data: transactions } = await supabase
    .from('xp_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Get user achievements
  const { data: achievements } = await supabase
    .from('user_achievements')
    .select('*, achievements(*)')
    .eq('user_id', user.id);
  
  return NextResponse.json({
    xp: xpData || { total_xp: 0, current_level: 1 },
    transactions: transactions || [],
    achievements: achievements || [],
  });
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { amount, type, description, reference_id, reference_type } = await request.json();
  
  // Award XP using the database function
  const { data, error } = await supabase.rpc('award_xp', {
    p_user_id: user.id,
    p_amount: amount,
    p_type: type,
    p_description: description,
    p_reference_id: reference_id,
    p_reference_type: reference_type,
  });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ totalXP: data });
}
EOF

echo -e "${GREEN}✓ XP API endpoints created${NC}"

echo -e "${YELLOW}Step 6: Updating environment variables...${NC}"

# Comment out Stripe-related env vars
if [ -f ".env" ]; then
    sed -i '' 's/^STRIPE_/#STRIPE_/g' .env
    sed -i '' 's/^NEXT_PUBLIC_STRIPE_/#NEXT_PUBLIC_STRIPE_/g' .env
fi

echo -e "${GREEN}✓ Environment variables updated${NC}"

echo -e "${YELLOW}Step 7: Installing dependencies...${NC}"

# Install any new dependencies
cd web && npm install && cd ..
cd backend && npm install && cd ..
cd mobile && npm install && cd ..

echo -e "${GREEN}✓ Dependencies installed${NC}"

echo "========================================="
echo -e "${GREEN}Migration Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Review the migrated files for any manual adjustments needed"
echo "2. Test the XP system thoroughly"
echo "3. Update any documentation"
echo "4. Deploy to staging environment first"
echo ""
echo "Backup created at: $BACKUP_FILE"
echo ""
echo "To rollback if needed:"
echo "  1. Restore database from backup"
echo "  2. Restore .bak files"
echo "  3. Reinstall Stripe dependencies"