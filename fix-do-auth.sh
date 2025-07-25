#!/bin/bash

echo "🔧 Troubleshooting DigitalOcean Authentication..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Let's troubleshoot your DO token issue...${NC}"
echo ""

echo -e "${YELLOW}Common issues and solutions:${NC}"
echo ""
echo "1. Token might be expired or invalid"
echo "2. Token might have wrong permissions"
echo "3. You might be using a Personal Access Token instead of an API Token"
echo ""

echo -e "${BLUE}Step 1: Check current authentication${NC}"
doctl auth list

echo ""
echo -e "${BLUE}Step 2: Clear existing authentication${NC}"
doctl auth remove --context default || true

echo ""
echo -e "${BLUE}Step 3: Generate a NEW API Token${NC}"
echo ""
echo "Please follow these EXACT steps:"
echo ""
echo "1. Go to: https://cloud.digitalocean.com/account/api/tokens"
echo "2. Click 'Generate New Token' (the blue button)"
echo "3. Name: 'wavesight-deployment'"
echo "4. IMPORTANT: Select 'Full Access' (not just read)"
echo "5. Expiration: No expiry (or 90 days)"
echo "6. Click 'Generate Token'"
echo "7. COPY the token immediately (it won't be shown again)"
echo ""
echo -e "${YELLOW}The token should start with 'dop_v1_' and be about 64 characters long${NC}"
echo ""
echo -e "${YELLOW}Press Enter when you have the NEW token ready...${NC}"
read

echo ""
echo -e "${BLUE}Step 4: Initialize with the new token${NC}"
doctl auth init --context wavesight

echo ""
echo -e "${BLUE}Step 5: Test the authentication${NC}"
if doctl account get --context wavesight; then
    echo -e "${GREEN}✓ Authentication successful!${NC}"
    
    # Set as default context
    doctl auth switch --context wavesight
    
    echo ""
    echo -e "${GREEN}✅ Ready to deploy! Run:${NC}"
    echo "./push-to-registry.sh"
else
    echo -e "${RED}❌ Authentication still failing.${NC}"
    echo ""
    echo "Try these alternatives:"
    echo ""
    echo "Alternative 1: Use Docker Hub instead"
    echo "docker login"
    echo "docker push jeremyuys/wavesight-web:v2-fixed"
    echo "kubectl set image deployment/wavesight-web web=jeremyuys/wavesight-web:v2-fixed -n wavesight"
    echo ""
    echo "Alternative 2: Check if you're using the right DO account"
    echo "Make sure you're logged into the same DO account that has the cluster"
fi