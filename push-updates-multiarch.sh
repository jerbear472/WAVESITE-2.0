#!/bin/bash

# Build for multiple architectures to work on any Kubernetes cluster
echo "📦 Building multi-architecture image..."

cd web

# Build for both AMD64 (cloud servers) and ARM64 (M1 Macs)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t jerbear472/wavesight-web:latest \
  --push .

cd ..

# Restart web deployment
echo "🔄 Restarting web server..."
kubectl rollout restart deployment/wavesight-web -n wavesight

# Watch the rollout
kubectl rollout status deployment/wavesight-web -n wavesight

echo "✅ Done! Check http://134.199.179.19/dashboard"