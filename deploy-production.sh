#!/bin/bash
set -e

echo "🚀 Deploying WaveSight Production App..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Force pull latest images
echo -e "${BLUE}Pulling latest images to ensure they're public...${NC}"
docker pull jerbear472/wavesight-web:latest
docker pull jerbear472/wavesight-backend:latest

# Delete and recreate
kubectl delete namespace wavesight --ignore-not-found=true
sleep 5

# Apply deployment
kubectl apply -f kubernetes/deployment-dockerhub.yaml

# Wait a bit
sleep 10

# Check status
echo -e "${BLUE}Checking deployment status...${NC}"
kubectl get pods -n wavesight

# Get events
echo -e "${BLUE}Recent events:${NC}"
kubectl get events -n wavesight --sort-by='.lastTimestamp' | tail -10

# Check if we need to restart
echo -e "${BLUE}Restarting pods to force re-pull...${NC}"
kubectl rollout restart deployment/wavesight-web -n wavesight
kubectl rollout restart deployment/wavesight-backend -n wavesight

# Wait for rollout
echo -e "${BLUE}Waiting for deployment...${NC}"
kubectl rollout status deployment/wavesight-web -n wavesight --timeout=300s || true
kubectl rollout status deployment/wavesight-backend -n wavesight --timeout=300s || true

# Final status
echo -e "${GREEN}Deployment complete! Final status:${NC}"
kubectl get pods -n wavesight
echo
echo -e "${GREEN}Your app should be available at: http://143.244.202.19${NC}"