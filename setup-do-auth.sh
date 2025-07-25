#!/bin/bash

echo "🔐 Setting up DigitalOcean Authentication..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Generate a DigitalOcean API Token${NC}"
echo ""
echo "1. Go to: https://cloud.digitalocean.com/account/api/tokens"
echo "2. Click 'Generate New Token'"
echo "3. Give it a name (e.g., 'wavesight-deployment')"
echo "4. Select 'Write' scope (this includes read)"
echo "5. Click 'Generate Token'"
echo "6. Copy the token (you won't see it again!)"
echo ""
echo -e "${YELLOW}Press Enter when you have your token ready...${NC}"
read

echo -e "${BLUE}Step 2: Configure doctl with your token${NC}"
doctl auth init

echo -e "${BLUE}Step 3: Verify authentication${NC}"
if doctl account get > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Authentication successful!${NC}"
    doctl account get
else
    echo -e "${RED}Authentication failed. Please check your token.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Test registry access${NC}"
if doctl registry get > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Registry exists!${NC}"
    REGISTRY_ENDPOINT=$(doctl registry get --format Endpoint --no-header)
    echo "Registry endpoint: $REGISTRY_ENDPOINT"
else
    echo -e "${YELLOW}No registry found. Creating one...${NC}"
    doctl registry create wavesight --subscription-tier basic
    REGISTRY_ENDPOINT=$(doctl registry get --format Endpoint --no-header)
    echo -e "${GREEN}✓ Registry created: $REGISTRY_ENDPOINT${NC}"
fi

echo ""
echo -e "${GREEN}✅ Setup complete! You can now run:${NC}"
echo "./deploy-to-do-registry.sh"