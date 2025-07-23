#!/bin/bash
set -e

echo "🌊 Creating WaveSight Kubernetes Cluster on DigitalOcean..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if doctl is authenticated
echo -e "${BLUE}Checking DigitalOcean authentication...${NC}"
if ! doctl account get &> /dev/null; then
    echo -e "${YELLOW}Not authenticated. Please run: doctl auth init${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated with DigitalOcean${NC}"

# Create cluster
echo -e "${BLUE}Creating Kubernetes cluster (this takes 5-7 minutes)...${NC}"
doctl kubernetes cluster create wavesight-cluster \
  --node-pool "name=wavesight-pool;size=s-2vcpu-4gb;count=2" \
  --region=nyc1 \
  --surge-upgrade=false \
  --ha=false

echo -e "${GREEN}✓ Cluster created successfully!${NC}"

# Save kubeconfig
echo -e "${BLUE}Configuring kubectl...${NC}"
doctl kubernetes cluster kubeconfig save wavesight-cluster

# Verify connection
echo -e "${BLUE}Verifying cluster connection...${NC}"
kubectl get nodes

echo -e "${GREEN}✓ kubectl configured!${NC}"

# Install nginx ingress
echo -e "${BLUE}Installing NGINX Ingress Controller...${NC}"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/do/deploy.yaml

echo -e "${BLUE}Waiting for ingress controller to be ready...${NC}"
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

echo -e "${GREEN}✓ Ingress controller ready!${NC}"

# Get load balancer IP
echo -e "${BLUE}Getting load balancer IP (may take 2-3 minutes)...${NC}"
sleep 30
LB_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -z "$LB_IP" ]; then
    echo -e "${YELLOW}Load balancer IP not ready yet. Check later with:${NC}"
    echo "kubectl get svc -n ingress-nginx ingress-nginx-controller"
else
    echo -e "${GREEN}✓ Load Balancer IP: $LB_IP${NC}"
    echo -e "${YELLOW}Point your domain to this IP address${NC}"
fi

echo -e "${GREEN}🎉 Cluster setup complete!${NC}"
echo -e "${BLUE}Next step: Run ./deploy-k8s.sh to deploy WaveSight${NC}"