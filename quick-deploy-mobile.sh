#!/bin/bash
set -e

echo "🚀 Quick Deploy WAVESITE2 Mobile to Kubernetes..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}⚠️  kubectl not found. Please install kubectl first.${NC}"
    echo "Visit: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check if connected to a cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not connected to a Kubernetes cluster.${NC}"
    echo "Please configure kubectl to connect to your cluster first."
    echo "Examples:"
    echo "  # For DigitalOcean: doctl kubernetes cluster kubeconfig save <cluster-name>"
    echo "  # For GKE: gcloud container clusters get-credentials <cluster-name> --region=<region>"
    echo "  # For Minikube: minikube start"
    exit 1
fi

echo -e "${BLUE}Connected to cluster:${NC}"
kubectl cluster-info | head -1

echo -e "${BLUE}Applying Kubernetes configurations...${NC}"

# Create namespace
echo "Creating namespace..."
kubectl apply -f kubernetes/namespace.yaml

# Apply secrets (user needs to configure these)
echo -e "${YELLOW}Applying secrets...${NC}"
if kubectl get secret wavesight-secrets -n wavesight &> /dev/null; then
    echo "✓ Secrets already exist"
else
    echo "⚠️  Creating default secrets. Please update kubernetes/secrets.yaml with your actual values."
    kubectl apply -f kubernetes/secrets.yaml
fi

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

echo -e "${GREEN}✓ Kubernetes resources applied${NC}"

# Check deployment status
echo -e "${BLUE}Checking deployment status...${NC}"
kubectl get pods -n wavesight

echo -e "${BLUE}Service endpoints:${NC}"
kubectl get services -n wavesight

echo -e "${BLUE}Ingress status:${NC}"
kubectl get ingress -n wavesight

echo -e "${GREEN}🎉 WAVESITE2 deployment initiated!${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Wait for all pods to be ready: kubectl get pods -n wavesight -w"
echo "2. Check logs if needed: kubectl logs -f deployment/wavesight-mobile -n wavesight"
echo "3. Port-forward for local testing: kubectl port-forward service/wavesight-mobile-service 8081:80 -n wavesight"
echo "4. Configure your domain DNS to point to the ingress IP"
echo
echo -e "${BLUE}Mobile app endpoints:${NC}"
echo "- Mobile service health: http://localhost:8081/health (with port-forward)"
echo "- Mobile app download: http://localhost:8081/download"
echo "- App info: http://localhost:8081/app-info"