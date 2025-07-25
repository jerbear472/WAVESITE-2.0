#!/bin/bash
set -e

echo "🚀 Deploying via Docker Hub..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Create Docker Hub repository${NC}"
echo "Go to: https://hub.docker.com/repositories"
echo "Click 'Create Repository'"
echo "Repository name: wavesight-web"
echo "Visibility: Public (or Private if you prefer)"
echo "Click 'Create'"
echo ""
echo -e "${YELLOW}Press Enter after creating the repository...${NC}"
read

echo -e "${BLUE}Step 2: Push image to Docker Hub${NC}"
docker push jeremyuys/wavesight-web:v2-fixed

# Also tag and push as latest
docker tag jeremyuys/wavesight-web:v2-fixed jeremyuys/wavesight-web:latest
docker push jeremyuys/wavesight-web:latest

echo -e "${GREEN}✓ Image pushed successfully!${NC}"

echo -e "${BLUE}Step 3: Check current Kubernetes deployment${NC}"
if kubectl get deployment wavesight-web -n wavesight > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Deployment exists${NC}"
    
    echo -e "${BLUE}Step 4: Update Kubernetes deployment${NC}"
    kubectl set image deployment/wavesight-web web=jeremyuys/wavesight-web:v2-fixed -n wavesight
    
    echo -e "${BLUE}Step 5: Monitor rollout${NC}"
    kubectl rollout status deployment/wavesight-web -n wavesight
    
    echo -e "${GREEN}✅ Deployment updated!${NC}"
else
    echo -e "${YELLOW}Deployment not found in wavesight namespace${NC}"
    echo "Let's check what deployments exist:"
    kubectl get deployments -A | grep web
    
    echo ""
    echo "If you see the deployment in a different namespace, we'll update the command"
fi

echo ""
echo -e "${BLUE}Current pods:${NC}"
kubectl get pods -n wavesight -l app=wavesight-web 2>/dev/null || kubectl get pods -A | grep wavesight

echo ""
echo -e "${GREEN}Check your app at: http://134.199.179.19${NC}"