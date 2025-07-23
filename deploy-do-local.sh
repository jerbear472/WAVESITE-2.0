#!/bin/bash
set -e

echo "🚀 Deploying WaveSight to DigitalOcean Kubernetes..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Building Docker images locally...${NC}"

# Build images with simple tags
docker build -t wavesight-web:latest -f web/Dockerfile.production web/
docker build -t wavesight-backend:latest -f backend/Dockerfile backend/

echo -e "${GREEN}✓ Images built${NC}"

# Update deployment files to use local images
echo -e "${BLUE}Updating Kubernetes manifests...${NC}"

# Create temporary deployment files with imagePullPolicy: Never
sed 's|image: wavesight/web:latest|image: wavesight-web:latest|g; s|imagePullPolicy: Always|imagePullPolicy: Never|g' kubernetes/web-deployment.yaml > kubernetes/web-deployment-local.yaml
sed 's|image: wavesight/backend:latest|image: wavesight-backend:latest|g; s|imagePullPolicy: Always|imagePullPolicy: Never|g' kubernetes/backend-deployment.yaml > kubernetes/backend-deployment-local.yaml

echo -e "${BLUE}Applying Kubernetes configurations...${NC}"

# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Apply secrets
kubectl apply -f kubernetes/secrets.yaml

# Deploy Redis
kubectl apply -f kubernetes/redis-deployment.yaml

# Deploy services with local images
kubectl apply -f kubernetes/backend-deployment-local.yaml
kubectl apply -f kubernetes/web-deployment-local.yaml

# Apply ingress
kubectl apply -f kubernetes/ingress.yaml

echo -e "${GREEN}✓ Kubernetes resources deployed${NC}"

# Wait for deployments
echo -e "${BLUE}Waiting for pods to start...${NC}"
kubectl wait --for=condition=ready pod -l app=redis -n wavesight --timeout=300s || true
kubectl wait --for=condition=ready pod -l app=wavesight-backend -n wavesight --timeout=300s || true
kubectl wait --for=condition=ready pod -l app=wavesight-web -n wavesight --timeout=300s || true

# Get status
echo -e "${BLUE}Deployment Status:${NC}"
kubectl get pods -n wavesight
kubectl get services -n wavesight

# Get Load Balancer IP
echo -e "${BLUE}Getting Load Balancer IP...${NC}"
LB_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ ! -z "$LB_IP" ]; then
    echo -e "${GREEN}✓ Load Balancer IP: $LB_IP${NC}"
    echo -e "${YELLOW}Your app will be accessible at:${NC}"
    echo -e "  Web: http://$LB_IP"
    echo -e "  API: http://$LB_IP/api"
else
    echo -e "${YELLOW}Load balancer IP not ready yet. Check with:${NC}"
    echo "kubectl get svc -n ingress-nginx ingress-nginx-controller"
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"

# Clean up temp files
rm -f kubernetes/web-deployment-local.yaml kubernetes/backend-deployment-local.yaml