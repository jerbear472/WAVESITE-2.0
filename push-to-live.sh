#!/bin/bash

echo "🚀 Pushing to live server (134.199.179.19)"

# Use buildx to ensure compatibility
cd web

# Create and use a new builder if needed
docker buildx create --use --name wavesight-builder 2>/dev/null || docker buildx use wavesight-builder

# Build and push in one command for linux/amd64
echo "📦 Building for cloud server (linux/amd64)..."
docker buildx build \
  --platform linux/amd64 \
  -t jerbear472/wavesight-web:latest \
  --push \
  .

cd ..

# Delete any failed pods
echo "🧹 Cleaning up failed pods..."
kubectl delete pods -n wavesight -l app=wavesight-web --field-selector=status.phase!=Running 2>/dev/null

# Force pull new image
echo "🔄 Updating deployment..."
kubectl set image deployment/wavesight-web web=jerbear472/wavesight-web:latest -n wavesight

# Wait for rollout
echo "⏳ Waiting for deployment..."
kubectl rollout status deployment/wavesight-web -n wavesight --timeout=300s

echo "✅ Done! Your changes should be live at http://134.199.179.19/dashboard"
echo "   (Give it 1-2 minutes to fully load)"

# Show current status
kubectl get pods -n wavesight -l app=wavesight-web