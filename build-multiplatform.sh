#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🐳 Building Multi-Platform Docker Images${NC}"

# Check if buildx is available
if ! docker buildx version &> /dev/null; then
    echo -e "${YELLOW}Setting up Docker buildx...${NC}"
    docker buildx create --use
fi

# Ensure we're using buildx
docker buildx use default

DOCKER_USERNAME="jerbear472"

echo -e "${BLUE}Building and pushing multi-platform images...${NC}"

# Build and push web image for both platforms
echo -e "${BLUE}Building web image for linux/amd64 and linux/arm64...${NC}"
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t $DOCKER_USERNAME/wavesight-web:latest \
  -f web/Dockerfile.production \
  --push \
  web/

echo -e "${GREEN}✓ Web image built and pushed${NC}"

# Build and push backend image for both platforms
echo -e "${BLUE}Building backend image for linux/amd64 and linux/arm64...${NC}"
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t $DOCKER_USERNAME/wavesight-backend:latest \
  -f backend/Dockerfile \
  --push \
  backend/

echo -e "${GREEN}✓ Backend image built and pushed${NC}"

echo -e "${GREEN}🎉 Multi-platform images are ready!${NC}"
echo -e "${YELLOW}Now redeploy to Kubernetes:${NC}"
echo -e "  kubectl delete namespace wavesight"
echo -e "  kubectl apply -f kubernetes/deployment-dockerhub.yaml"