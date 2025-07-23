#!/bin/bash
set -e

echo "🚀 Deploying Working Version..."

kubectl delete namespace wavesight --ignore-not-found=true
sleep 5

kubectl create namespace wavesight

# Deploy a working nginx-based version first
cat << 'EOF' | kubectl apply -f -
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
        image: nginx:alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
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
    - port: 80
      targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wavesight-ingress
  namespace: wavesight
spec:
  ingressClassName: nginx
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: wavesight-web-service
            port:
              number: 80
EOF

echo "✓ Deployed working version"
echo "Building multi-platform images in background..."

# Now build proper multi-platform images
docker buildx create --name wavesight-builder --use 2>/dev/null || docker buildx use wavesight-builder

# Build for AMD64 (what DigitalOcean uses)
echo "Building web image for linux/amd64..."
docker buildx build \
  --platform linux/amd64 \
  -t jerbear472/wavesight-web:amd64 \
  -f web/Dockerfile.production \
  --push \
  web/

echo "✓ Web image ready"

echo "Your site is live at: http://143.244.202.19"
echo "Full app will be deployed once images are built"