#!/bin/bash

# Vercel Deployment Script for WAVESITE2
# This script helps deploy the web app to Vercel

echo "🚀 Starting Vercel deployment for WAVESITE2..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Change to web directory
cd web || { echo -e "${RED}Error: web directory not found${NC}"; exit 1; }

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm i -g vercel
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build the project locally first to catch any errors
echo -e "${YELLOW}Building project locally...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Please fix the errors before deploying.${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"

# Deploy to Vercel
echo -e "${YELLOW}Deploying to Vercel...${NC}"
echo -e "${YELLOW}Note: You'll need to set environment variables in Vercel dashboard${NC}"

# For first-time deployment
if [ ! -f ".vercel/project.json" ]; then
    echo -e "${YELLOW}First time deployment detected...${NC}"
    vercel
else
    # For subsequent deployments
    echo -e "${YELLOW}Deploying to production...${NC}"
    vercel --prod
fi

echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Go to your Vercel dashboard"
echo "2. Add environment variables:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - NEXT_PUBLIC_API_URL (update with your backend URL)"
echo "3. Redeploy if you added environment variables"
echo ""
echo "🔗 Your app will be available at the URL shown above"