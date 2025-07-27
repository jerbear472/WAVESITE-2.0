#!/bin/bash

# Simple Kubernetes Deployment Script for WaveSight
# This script builds and deploys your changes to Kubernetes

echo "🚀 WaveSight Kubernetes Deployment"
echo "================================="

# Set variables
DOCKER_REGISTRY="docker.io"  # Change to your registry (e.g., gcr.io, ecr, etc.)
DOCKER_USERNAME="your-docker-username"  # Change this!
VERSION=$(date +%Y%m%d-%H%M%S)  # Timestamp as version

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Version: ${VERSION}${NC}"

# Step 1: Build Docker images
echo -e "\n${GREEN}Step 1: Building Docker images...${NC}"
cd web
docker build -t ${DOCKER_REGISTRY}/${DOCKER_USERNAME}/wavesight-web:${VERSION} -t ${DOCKER_REGISTRY}/${DOCKER_USERNAME}/wavesight-web:latest .
cd ..

cd backend
docker build -t ${DOCKER_REGISTRY}/${DOCKER_USERNAME}/wavesight-backend:${VERSION} -t ${DOCKER_REGISTRY}/${DOCKER_USERNAME}/wavesight-backend:latest .
cd ..

# Step 2: Push to Docker registry
echo -e "\n${GREEN}Step 2: Pushing images to registry...${NC}"
docker push ${DOCKER_REGISTRY}/${DOCKER_USERNAME}/wavesight-web:${VERSION}
docker push ${DOCKER_REGISTRY}/${DOCKER_USERNAME}/wavesight-web:latest
docker push ${DOCKER_REGISTRY}/${DOCKER_USERNAME}/wavesight-backend:${VERSION}
docker push ${DOCKER_REGISTRY}/${DOCKER_USERNAME}/wavesight-backend:latest

# Step 3: Update Kubernetes deployments
echo -e "\n${GREEN}Step 3: Updating Kubernetes deployments...${NC}"

# Update web deployment
kubectl set image deployment/wavesight-web web=${DOCKER_REGISTRY}/${DOCKER_USERNAME}/wavesight-web:${VERSION} -n wavesight

# Update backend deployment
kubectl set image deployment/wavesight-backend backend=${DOCKER_REGISTRY}/${DOCKER_USERNAME}/wavesight-backend:${VERSION} -n wavesight

# Step 4: Check rollout status
echo -e "\n${GREEN}Step 4: Checking deployment status...${NC}"
kubectl rollout status deployment/wavesight-web -n wavesight
kubectl rollout status deployment/wavesight-backend -n wavesight

# Step 5: Show pods
echo -e "\n${GREEN}Step 5: Current pods:${NC}"
kubectl get pods -n wavesight

echo -e "\n✅ ${GREEN}Deployment complete!${NC}"
echo -e "🌐 Your changes should be live now!"
echo -e "\nTo check logs: kubectl logs -f deployment/wavesight-web -n wavesight"