#!/bin/bash
set -e

echo "🚀 Deploying WaveSight to DigitalOcean Container Registry..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}doctl CLI is not installed. Please install it first:${NC}"
    echo "brew install doctl"
    exit 1
fi

echo -e "${BLUE}Step 1: Create DigitalOcean Container Registry${NC}"
echo "Creating registry (if not exists)..."

# Create registry - this will show existing if already created
doctl registry create wavesight-registry --subscription-tier basic || echo "Registry may already exist"

# Get registry endpoint
REGISTRY_ENDPOINT=$(doctl registry get --format Endpoint --no-header)
echo -e "${GREEN}Registry endpoint: $REGISTRY_ENDPOINT${NC}"

echo -e "${BLUE}Step 2: Login to DigitalOcean Registry${NC}"
doctl registry login

echo -e "${BLUE}Step 3: Tag Docker image for DO Registry${NC}"
# Tag the image we built earlier
docker tag jeremyuys/wavesight-web:v2-fixed $REGISTRY_ENDPOINT/wavesight-web:v2-fixed
docker tag jeremyuys/wavesight-web:v2-fixed $REGISTRY_ENDPOINT/wavesight-web:latest

echo -e "${BLUE}Step 4: Push image to DO Registry${NC}"
docker push $REGISTRY_ENDPOINT/wavesight-web:v2-fixed
docker push $REGISTRY_ENDPOINT/wavesight-web:latest

echo -e "${GREEN}✓ Image pushed successfully${NC}"

echo -e "${BLUE}Step 5: Configure Kubernetes to use DO Registry${NC}"
# This connects your cluster to the registry
doctl kubernetes cluster registry add

echo -e "${BLUE}Step 6: Update Kubernetes deployment${NC}"
# Update the deployment to use the new image from DO Registry
kubectl set image deployment/wavesight-web web=$REGISTRY_ENDPOINT/wavesight-web:v2-fixed -n wavesight

echo -e "${BLUE}Step 7: Monitor rollout${NC}"
kubectl rollout status deployment/wavesight-web -n wavesight

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}Deployment Summary:${NC}"
echo "Registry: $REGISTRY_ENDPOINT"
echo "Image: $REGISTRY_ENDPOINT/wavesight-web:v2-fixed"
echo ""

kubectl get pods -n wavesight -l app=wavesight-web
echo ""
echo -e "${GREEN}Your updated app should be live at: http://134.199.179.19${NC}"
echo ""
echo "To view logs:"
echo "kubectl logs -n wavesight -l app=wavesight-web --tail=50 -f"
echo ""
echo "To clean up old images in the registry later:"
echo "doctl registry garbage-collection start --include-untagged-manifests --force"