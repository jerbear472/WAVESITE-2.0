#\!/bin/bash

# Super Simple Deploy - Just rebuild and update\!
echo "🚀 Quick Deploy to Kubernetes"
echo "============================"

# Quick config - CHANGE THESE\!
DOCKER_USER="your-username"  # <-- Change this to your Docker Hub username
NAMESPACE="wavesight"

# Build and push web
echo "📦 Building web..."
cd web
docker build -t ${DOCKER_USER}/wavesight-web:latest .
docker push ${DOCKER_USER}/wavesight-web:latest
cd ..

# Build and push backend
echo "📦 Building backend..."
cd backend  
docker build -t ${DOCKER_USER}/wavesight-backend:latest .
docker push ${DOCKER_USER}/wavesight-backend:latest
cd ..

# Force Kubernetes to pull new images
echo "🔄 Restarting pods..."
kubectl rollout restart deployment/wavesight-web -n ${NAMESPACE}
kubectl rollout restart deployment/wavesight-backend -n ${NAMESPACE}

# Watch the rollout
echo "👀 Watching rollout..."
kubectl rollout status deployment/wavesight-web -n ${NAMESPACE}

echo "✅ Done\! Your changes are being deployed\!"
echo "Check status: kubectl get pods -n wavesight"
EOF < /dev/null
