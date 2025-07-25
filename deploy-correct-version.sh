#!/bin/bash
set -e

echo "🚀 Deploying the CORRECT WaveSight version to Kubernetes..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DOCKER_USERNAME="jeremyuys"  # Your Docker Hub username
IMAGE_NAME="wavesight-web"
TAG="v2-$(date +%Y%m%d-%H%M%S)"
FULL_IMAGE="$DOCKER_USERNAME/$IMAGE_NAME:$TAG"

echo -e "${BLUE}1. Building Docker image with today's changes...${NC}"
echo "   - Authenticated layout with Navigation"
echo "   - Updated logout functionality"
echo "   - Connected dashboard pages"
echo ""

cd web
docker build -t $FULL_IMAGE -f Dockerfile.production .

echo -e "${GREEN}✓ Docker image built successfully${NC}"

echo -e "${BLUE}2. Logging into Docker Hub...${NC}"
echo "Please enter your Docker Hub password for user $DOCKER_USERNAME:"
docker login -u $DOCKER_USERNAME

echo -e "${BLUE}3. Pushing image to Docker Hub...${NC}"
docker push $FULL_IMAGE

# Also tag and push as latest
docker tag $FULL_IMAGE $DOCKER_USERNAME/$IMAGE_NAME:latest
docker push $DOCKER_USERNAME/$IMAGE_NAME:latest

echo -e "${GREEN}✓ Image pushed successfully${NC}"

echo -e "${BLUE}4. Updating Kubernetes deployment...${NC}"
kubectl set image deployment/wavesight-web web=$FULL_IMAGE -n wavesight

echo -e "${BLUE}5. Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/wavesight-web -n wavesight

echo -e "${GREEN}✓ Deployment updated successfully!${NC}"

echo ""
echo -e "${BLUE}Deployment Summary:${NC}"
echo "Image: $FULL_IMAGE"
echo ""

kubectl get pods -n wavesight -l app=wavesight-web
echo ""
kubectl get service wavesight-web-service -n wavesight
echo ""

echo -e "${GREEN}🎉 The CORRECT version is now deployed!${NC}"
echo -e "${YELLOW}Access your app at: http://134.199.179.19${NC}"
echo ""
echo "To view logs:"
echo "kubectl logs -n wavesight -l app=wavesight-web --tail=50 -f"