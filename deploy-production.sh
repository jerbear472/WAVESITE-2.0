#!/bin/bash

# =====================================================
# WAVESIGHT PRODUCTION DEPLOYMENT SCRIPT
# =====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    WAVESIGHT PRODUCTION DEPLOYMENT${NC}"
echo -e "${BLUE}================================================${NC}\n"

# Step 1: Check environment
echo -e "${YELLOW}📋 Step 1: Checking environment...${NC}"

if [ ! -f "web/.env.production" ]; then
    echo -e "${RED}❌ Error: web/.env.production not found${NC}"
    echo "Please create web/.env.production with your production Supabase credentials"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Error: Git is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment check passed${NC}\n"

# Step 2: Run database migration
echo -e "${YELLOW}📋 Step 2: Database Migration${NC}"
echo -e "${BLUE}Please run the following in your Supabase SQL Editor:${NC}"
echo "1. Copy contents of UNIFIED_EARNINGS_SYSTEM.sql"
echo "2. Paste and run in Supabase SQL Editor"
echo -e "${YELLOW}Press Enter when database migration is complete...${NC}"
read -r

# Step 3: Install dependencies
echo -e "${YELLOW}📋 Step 3: Installing dependencies...${NC}"

cd web
npm install --production
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}\n"

# Step 4: Run tests
echo -e "${YELLOW}📋 Step 4: Running production tests...${NC}"

node test-production-flow.js

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed. Please fix issues before deploying.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All tests passed${NC}\n"

# Step 5: Build production bundle
echo -e "${YELLOW}📋 Step 5: Building production bundle...${NC}"

cd web
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please fix errors before deploying.${NC}"
    exit 1
fi

cd ..
echo -e "${GREEN}✅ Production build complete${NC}\n"

# Step 6: Git operations
echo -e "${YELLOW}📋 Step 6: Preparing Git repository...${NC}"

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}Uncommitted changes detected. Committing...${NC}"
    git add .
    git commit -m "Deploy: Production release with unified earnings system

- Unified earnings calculation system
- Cashout functionality
- Swipe validation interface
- Analytics dashboard
- Onboarding flow
- Quality scoring and bonuses
- Tier progression system"
fi

# Push to repository
echo -e "${YELLOW}Pushing to repository...${NC}"
git push origin main

echo -e "${GREEN}✅ Code pushed to repository${NC}\n"

# Step 7: Deploy to Vercel
echo -e "${YELLOW}📋 Step 7: Deploying to Vercel...${NC}"

if command -v vercel &> /dev/null; then
    cd web
    vercel --prod
    cd ..
else
    echo -e "${BLUE}Please deploy manually:${NC}"
    echo "1. Go to https://vercel.com"
    echo "2. Import your Git repository"
    echo "3. Set environment variables from web/.env.production"
    echo "4. Deploy"
fi

echo -e "${GREEN}✅ Deployment initiated${NC}\n"

# Step 8: Post-deployment checklist
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    POST-DEPLOYMENT CHECKLIST${NC}"
echo -e "${BLUE}================================================${NC}\n"

echo "Please verify the following:"
echo "[ ] Website is live and accessible"
echo "[ ] User can sign up and log in"
echo "[ ] Trend submission works with earnings calculation"
echo "[ ] Validation interface loads and works"
echo "[ ] Dashboard shows correct statistics"
echo "[ ] Cashout request can be submitted"
echo ""
echo "Monitor these metrics:"
echo "• Check Supabase dashboard for database activity"
echo "• Monitor Vercel logs for any errors"
echo "• Watch earnings_ledger table for transactions"
echo "• Track user signups in auth.users"
echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo ""
echo "Your app is now live and ready to revolutionize trend spotting!"
echo ""
echo "Next steps:"
echo "1. Share with 10 beta users"
echo "2. Monitor performance for 24 hours"
echo "3. Gather feedback and iterate"
echo "4. Launch marketing campaign"
echo ""
echo -e "${BLUE}Good luck with your launch! 🚀${NC}"