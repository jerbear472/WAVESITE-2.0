#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🐳 Docker Hub Deployment Script${NC}"
echo -e "${YELLOW}Make sure you're logged in to Docker Hub first!${NC}"
echo -e "${YELLOW}Run 'docker login' if you haven't already.${NC}"
echo

# Get Docker Hub username
read -p "Enter your Docker Hub username: " DOCKER_USERNAME

if [ -z "$DOCKER_USERNAME" ]; then
    echo -e "${RED}Docker Hub username is required!${NC}"
    exit 1
fi

echo -e "${BLUE}Using Docker Hub username: ${GREEN}$DOCKER_USERNAME${NC}"

# Check if logged in
if ! docker info 2>/dev/null | grep -q "Username: $DOCKER_USERNAME"; then
    echo -e "${YELLOW}Please login to Docker Hub first:${NC}"
    docker login
fi

# Build images with proper tags
echo -e "${BLUE}Building Docker images...${NC}"

echo "Building web image..."
docker build -t $DOCKER_USERNAME/wavesight-web:latest -f web/Dockerfile.production web/

echo "Building backend image..."
docker build -t $DOCKER_USERNAME/wavesight-backend:latest -f backend/Dockerfile backend/

echo -e "${GREEN}✓ Images built successfully${NC}"

# Push images
echo -e "${BLUE}Pushing images to Docker Hub...${NC}"

echo "Pushing web image..."
docker push $DOCKER_USERNAME/wavesight-web:latest

echo "Pushing backend image..."
docker push $DOCKER_USERNAME/wavesight-backend:latest

echo -e "${GREEN}✓ Images pushed successfully${NC}"

# Create updated Kubernetes manifests
echo -e "${BLUE}Creating Kubernetes deployment files...${NC}"

cat > kubernetes/deployment-dockerhub.yaml << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: wavesight
---
apiVersion: v1
kind: Secret
metadata:
  name: wavesight-secrets
  namespace: wavesight
type: Opaque
stringData:
  supabase-url: "https://achuavagkhjenaypawij.supabase.co"
  supabase-anon-key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g"
  database-url: "postgresql://postgres:qIvwos-vujzy1-dopzeb@db.achuavagkhjenaypawij.supabase.co:5432/postgres"
  jwt-secret: "your-jwt-secret-key"
---
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
        image: $DOCKER_USERNAME/wavesight-web:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEXT_PUBLIC_SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: wavesight-secrets
              key: supabase-url
        - name: NEXT_PUBLIC_SUPABASE_ANON_KEY
          valueFrom:
            secretKeyRef:
              name: wavesight-secrets
              key: supabase-anon-key
        - name: NEXT_PUBLIC_API_URL
          value: "http://wavesight-backend-service"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
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
  type: ClusterIP
---
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
        image: $DOCKER_USERNAME/wavesight-backend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: wavesight-secrets
              key: database-url
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: wavesight-secrets
              key: supabase-url
        - name: SUPABASE_SERVICE_KEY
          valueFrom:
            secretKeyRef:
              name: wavesight-secrets
              key: supabase-anon-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
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
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wavesight-ingress
  namespace: wavesight
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: wavesight-backend-service
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: wavesight-web-service
            port:
              number: 80
EOF

echo -e "${GREEN}✓ Deployment files created${NC}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}Docker Hub setup complete!${NC}"
echo -e "${YELLOW}========================================${NC}"
echo
echo -e "Your images are now available at:"
echo -e "  ${BLUE}$DOCKER_USERNAME/wavesight-web:latest${NC}"
echo -e "  ${BLUE}$DOCKER_USERNAME/wavesight-backend:latest${NC}"
echo
echo -e "${YELLOW}To deploy to Kubernetes, run:${NC}"
echo -e "  ${GREEN}kubectl delete namespace wavesight${NC}"
echo -e "  ${GREEN}kubectl apply -f kubernetes/deployment-dockerhub.yaml${NC}"
echo
echo -e "${YELLOW}Your app will be live at:${NC}"
echo -e "  ${GREEN}http://143.244.202.19${NC}"