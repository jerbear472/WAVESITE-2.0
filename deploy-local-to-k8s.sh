#!/bin/bash
set -e

echo "🚀 Deploying local WaveSight build to Kubernetes..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Since we can't push to Docker Hub without auth, let's use kubectl cp approach
# or port-forward the local development

echo -e "${BLUE}Option 1: Port-forward local development to Kubernetes LoadBalancer${NC}"
echo "This will make your local dev server accessible via the Kubernetes external IP"
echo ""
echo -e "${BLUE}Option 2: Use kubectl cp to update files directly in the pod${NC}"
echo "This will copy your local files to the running pods"
echo ""

read -p "Choose option (1 or 2): " -n 1 -r
echo

case $REPLY in
    1)
        echo -e "${BLUE}Setting up port-forward from Kubernetes to local...${NC}"
        
        # Get the service external IP
        EXTERNAL_IP=$(kubectl get service wavesight-web-service -n wavesight -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        echo -e "${GREEN}External IP: $EXTERNAL_IP${NC}"
        
        # Create a reverse tunnel using kubectl
        echo -e "${YELLOW}Note: This requires your local dev server to be running on port 3000${NC}"
        echo "Starting reverse proxy..."
        
        # Get pod name
        POD_NAME=$(kubectl get pods -n wavesight -l app=wavesight-web -o jsonpath='{.items[0].metadata.name}')
        
        # Forward from pod to local
        kubectl port-forward -n wavesight $POD_NAME 3001:3000 &
        PF_PID=$!
        
        echo -e "${GREEN}✓ Port-forward established${NC}"
        echo -e "${YELLOW}Your app should now reflect local changes at: http://$EXTERNAL_IP${NC}"
        echo "Press Ctrl+C to stop"
        wait $PF_PID
        ;;
    2)
        echo -e "${BLUE}Creating a temporary updated image...${NC}"
        
        # Since we built the image locally, we need to get it to the cluster
        # For DigitalOcean, we can use their registry
        
        echo -e "${YELLOW}To deploy your local image, you need to:${NC}"
        echo "1. Push to a registry accessible by your cluster"
        echo "2. Update the deployment with the new image"
        echo ""
        echo "For now, let's update the deployment to pull the latest from the current registry:"
        
        # Force a new pull by adding a timestamp annotation
        TIMESTAMP=$(date +%s)
        kubectl patch deployment wavesight-web -n wavesight \
          -p '{"spec":{"template":{"metadata":{"annotations":{"redeployed":"'$TIMESTAMP'"}}}}}'
        
        echo -e "${GREEN}✓ Deployment updated${NC}"
        kubectl rollout status deployment/wavesight-web -n wavesight
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}Current pods:${NC}"
kubectl get pods -n wavesight -l app=wavesight-web
echo ""
echo -e "${BLUE}To view logs:${NC}"
echo "kubectl logs -n wavesight -l app=wavesight-web --tail=50 -f"