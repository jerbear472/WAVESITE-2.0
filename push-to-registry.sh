#!/bin/bash
set -e

echo "🚀 Pushing WaveSight to your DigitalOcean Container Registry..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Your registry URL from the screenshot
REGISTRY_URL="registry.digitalocean.com/wavesitecontainer"

echo -e "${BLUE}Step 1: Authenticate with DigitalOcean Registry${NC}"
echo "Running: doctl registry login"
doctl registry login

echo -e "${BLUE}Step 2: Tag your Docker image for the registry${NC}"
# Tag the image we built earlier
docker tag jeremyuys/wavesight-web:v2-fixed $REGISTRY_URL/wavesight-web:v2-fixed
docker tag jeremyuys/wavesight-web:v2-fixed $REGISTRY_URL/wavesight-web:latest

echo -e "${GREEN}✓ Images tagged${NC}"

echo -e "${BLUE}Step 3: Push images to DigitalOcean Registry${NC}"
docker push $REGISTRY_URL/wavesight-web:v2-fixed
docker push $REGISTRY_URL/wavesight-web:latest

echo -e "${GREEN}✓ Images pushed successfully!${NC}"

echo -e "${BLUE}Step 4: Connect registry to your Kubernetes cluster${NC}"
# This ensures your cluster can pull from the registry
doctl kubernetes cluster registry add

echo -e "${BLUE}Step 5: Update Kubernetes deployment${NC}"
# Update the deployment to use the new image
kubectl set image deployment/wavesight-web web=$REGISTRY_URL/wavesight-web:v2-fixed -n wavesight

echo -e "${BLUE}Step 6: Monitor the rollout${NC}"
kubectl rollout status deployment/wavesight-web -n wavesight

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}Verification:${NC}"
kubectl get pods -n wavesight -l app=wavesight-web
echo ""
echo -e "${GREEN}Your updated app should now be live at: http://134.199.179.19${NC}"
echo ""
echo "To view logs:"
echo "kubectl logs -n wavesight -l app=wavesight-web --tail=50 -f"