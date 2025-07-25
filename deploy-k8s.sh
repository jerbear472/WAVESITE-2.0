#!/bin/bash
set -e

echo "🚀 Starting WaveSight Kubernetes Deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"wavesight"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
DOCKER_USERNAME=${DOCKER_USERNAME:-"your-dockerhub-username"}

echo -e "${BLUE}Building Docker images...${NC}"

# Build web image
echo "Building web service..."
docker build -t $DOCKER_REGISTRY/web:$IMAGE_TAG -f web/Dockerfile.production web/

# Build backend image
echo "Building backend service..."
docker build -t $DOCKER_REGISTRY/backend:$IMAGE_TAG backend/

# Build mobile image
echo "Building mobile service..."
docker build -t $DOCKER_REGISTRY/mobile:$IMAGE_TAG mobile/

echo -e "${GREEN}✓ Docker images built successfully${NC}"

# Push images (optional - comment out if using local registry)
echo -e "${BLUE}Pushing images to registry...${NC}"
echo "Note: You need to be logged in to your Docker registry"
echo "Run 'docker login' if you haven't already"

read -p "Push images to registry? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    docker push $DOCKER_REGISTRY/web:$IMAGE_TAG
    docker push $DOCKER_REGISTRY/backend:$IMAGE_TAG
    docker push $DOCKER_REGISTRY/mobile:$IMAGE_TAG
    echo -e "${GREEN}✓ Images pushed successfully${NC}"
fi

echo -e "${BLUE}Applying Kubernetes configurations...${NC}"

# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Apply secrets
echo -e "${YELLOW}Applying secrets...${NC}"
kubectl apply -f kubernetes/secrets.yaml

# Deploy Redis
echo "Deploying Redis..."
kubectl apply -f kubernetes/redis-deployment.yaml

# Deploy backend
echo "Deploying backend service..."
kubectl apply -f kubernetes/backend-deployment.yaml

# Deploy web
echo "Deploying web service..."
kubectl apply -f kubernetes/web-deployment.yaml

# Deploy mobile
echo "Deploying mobile service..."
kubectl apply -f kubernetes/mobile-deployment.yaml

# Apply ingress
echo "Setting up ingress..."
kubectl apply -f kubernetes/ingress.yaml

echo -e "${GREEN}✓ Kubernetes resources deployed${NC}"

# Wait for deployments
echo -e "${BLUE}Waiting for deployments to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/wavesight-web -n wavesight
kubectl wait --for=condition=available --timeout=300s deployment/wavesight-backend -n wavesight
kubectl wait --for=condition=available --timeout=300s deployment/wavesight-mobile -n wavesight
kubectl wait --for=condition=available --timeout=300s deployment/redis -n wavesight

echo -e "${GREEN}✓ All deployments are ready!${NC}"

# Get service status
echo -e "${BLUE}Service Status:${NC}"
kubectl get pods -n wavesight
kubectl get services -n wavesight

# Get ingress info
echo -e "${BLUE}Ingress Status:${NC}"
kubectl get ingress -n wavesight

echo -e "${GREEN}🎉 WaveSight deployment complete!${NC}"
echo -e "${YELLOW}Note: Update your DNS records to point to the ingress IP address${NC}"