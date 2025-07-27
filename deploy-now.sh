#!/bin/bash

# WaveSight Kubernetes Deployment
echo "🚀 WaveSight Kubernetes Deployment"
echo "================================="

# Configuration
DOCKER_USER="${DOCKER_USER:-wavesight}"  # Set DOCKER_USER env var or defaults to 'wavesight'
NAMESPACE="wavesight"
VERSION="latest"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if user is logged into Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running or you're not logged in${NC}"
    echo "Please run: docker login"
    exit 1
fi

# Step 1: Build Docker images
echo -e "\n${GREEN}Step 1: Building Docker images...${NC}"

# Build web image
echo "Building web application..."
cd web
if docker build -t ${DOCKER_USER}/wavesight-web:${VERSION} .; then
    echo -e "${GREEN}✓ Web image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build web image${NC}"
    exit 1
fi
cd ..

# Build backend image
echo "Building backend application..."
cd backend
if docker build -t ${DOCKER_USER}/wavesight-backend:${VERSION} .; then
    echo -e "${GREEN}✓ Backend image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build backend image${NC}"
    exit 1
fi
cd ..

# Step 2: Push to Docker Hub
echo -e "\n${GREEN}Step 2: Pushing images to Docker Hub...${NC}"
echo "Pushing web image..."
docker push ${DOCKER_USER}/wavesight-web:${VERSION}

echo "Pushing backend image..."
docker push ${DOCKER_USER}/wavesight-backend:${VERSION}

# Step 3: Update Kubernetes deployments
echo -e "\n${GREEN}Step 3: Deploying to Kubernetes...${NC}"

# Check if namespace exists
if ! kubectl get namespace ${NAMESPACE} > /dev/null 2>&1; then
    echo "Creating namespace ${NAMESPACE}..."
    kubectl create namespace ${NAMESPACE}
fi

# Update deployment YAMLs with correct image names
echo "Updating deployment configurations..."

# Create updated web deployment
cat > kubernetes/web-deployment-updated.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wavesight-web
  namespace: wavesight
spec:
  replicas: 2
  selector:
    matchLabels:
      app: wavesight-web
  template:
    metadata:
      labels:
        app: wavesight-web
    spec:
      containers:
      - name: web
        image: ${DOCKER_USER}/wavesight-web:${VERSION}
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEXT_PUBLIC_SUPABASE_URL
          value: "https://achuavagkhjenaypawij.supabase.co"
        - name: NEXT_PUBLIC_SUPABASE_ANON_KEY
          value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g"
---
apiVersion: v1
kind: Service
metadata:
  name: wavesight-web-service
  namespace: wavesight
spec:
  selector:
    app: wavesight-web
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
EOF

# Create updated backend deployment
cat > kubernetes/backend-deployment-updated.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wavesight-backend
  namespace: wavesight
spec:
  replicas: 2
  selector:
    matchLabels:
      app: wavesight-backend
  template:
    metadata:
      labels:
        app: wavesight-backend
    spec:
      containers:
      - name: backend
        image: ${DOCKER_USER}/wavesight-backend:${VERSION}
        imagePullPolicy: Always
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          value: "postgresql://postgres:qIvwos-vujzy1-dopzeb@db.achuavagkhjenaypawij.supabase.co:5432/postgres"
        - name: SUPABASE_URL
          value: "https://achuavagkhjenaypawij.supabase.co"
        - name: SUPABASE_SERVICE_KEY
          value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g"
---
apiVersion: v1
kind: Service
metadata:
  name: wavesight-backend-service
  namespace: wavesight
spec:
  selector:
    app: wavesight-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8000
  type: ClusterIP
EOF

# Apply deployments
echo "Applying Kubernetes configurations..."
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/web-deployment-updated.yaml
kubectl apply -f kubernetes/backend-deployment-updated.yaml

# Step 4: Check deployment status
echo -e "\n${GREEN}Step 4: Checking deployment status...${NC}"
kubectl rollout status deployment/wavesight-web -n ${NAMESPACE} --timeout=300s
kubectl rollout status deployment/wavesight-backend -n ${NAMESPACE} --timeout=300s

# Step 5: Get service information
echo -e "\n${GREEN}Step 5: Service Information:${NC}"
kubectl get services -n ${NAMESPACE}
echo ""
kubectl get pods -n ${NAMESPACE}

echo -e "\n✅ ${GREEN}Deployment complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. If using LoadBalancer, wait for external IP: kubectl get svc -n wavesight -w"
echo "2. If using local cluster, use port-forward: kubectl port-forward svc/wavesight-web-service 3000:80 -n wavesight"
echo "3. Check logs: kubectl logs -f deployment/wavesight-web -n wavesight"