#!/bin/bash
set -e

echo "🚀 Quick WaveSight Kubernetes Update..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "web/package.json" ]; then
    echo -e "${RED}Error: Must run from WAVESITE2 root directory${NC}"
    exit 1
fi

# Option 1: Use kubectl port-forward for local development
echo -e "${BLUE}Option 1: Port-forward to local development${NC}"
echo "This will expose your local Next.js dev server through Kubernetes"
echo ""

# Option 2: Quick deployment update using existing image
echo -e "${BLUE}Option 2: Restart pods to pull latest image${NC}"
echo "This will restart the pods, useful if image was updated externally"
echo ""

read -p "Choose option (1 for port-forward, 2 for restart, 3 to check Docker): " -n 1 -r
echo

case $REPLY in
    1)
        echo -e "${BLUE}Setting up port-forward to local development...${NC}"
        # Kill any existing port-forward
        pkill -f "kubectl port-forward" || true
        
        # Start port-forward in background
        kubectl port-forward -n wavesight service/wavesight-web-service 8080:80 &
        PF_PID=$!
        
        echo -e "${GREEN}✓ Port-forward established${NC}"
        echo -e "${YELLOW}Your Kubernetes service is now accessible at: http://localhost:8080${NC}"
        echo -e "${YELLOW}Local development server at: http://localhost:3000${NC}"
        echo ""
        echo "Press Ctrl+C to stop port-forwarding"
        wait $PF_PID
        ;;
    2)
        echo -e "${BLUE}Restarting pods...${NC}"
        kubectl rollout restart deployment/wavesight-web -n wavesight
        echo -e "${GREEN}✓ Rollout initiated${NC}"
        
        echo -e "${BLUE}Waiting for rollout to complete...${NC}"
        kubectl rollout status deployment/wavesight-web -n wavesight
        
        echo -e "${GREEN}✓ Deployment updated!${NC}"
        kubectl get pods -n wavesight
        ;;
    3)
        echo -e "${BLUE}Checking Docker status...${NC}"
        if docker version > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Docker is running${NC}"
            echo ""
            echo "Would you like to build and deploy a new image? (y/n)"
            read -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                # Use a simple tag based on timestamp
                TAG=$(date +%Y%m%d-%H%M%S)
                REGISTRY="jeremyuys" # Change this to your Docker Hub username
                
                echo -e "${BLUE}Building Docker image...${NC}"
                cd web
                docker build -t $REGISTRY/wavesight-web:$TAG -f Dockerfile.production .
                
                echo -e "${BLUE}Pushing to registry...${NC}"
                docker push $REGISTRY/wavesight-web:$TAG
                
                echo -e "${BLUE}Updating Kubernetes deployment...${NC}"
                kubectl set image deployment/wavesight-web web=$REGISTRY/wavesight-web:$TAG -n wavesight
                
                echo -e "${GREEN}✓ Deployment updated with new image${NC}"
                kubectl rollout status deployment/wavesight-web -n wavesight
            fi
        else
            echo -e "${RED}Docker is not running. Please start Docker Desktop first.${NC}"
            echo "On macOS: open -a Docker"
        fi
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}Current deployment status:${NC}"
kubectl get pods -n wavesight
echo ""
echo -e "${BLUE}Service details:${NC}"
kubectl get service wavesight-web-service -n wavesight
echo ""
echo -e "${GREEN}External access: http://134.199.179.19${NC}"