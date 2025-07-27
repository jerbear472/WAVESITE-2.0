#!/bin/bash

# Simple push to your LIVE server
echo "📦 Building and pushing updates..."

# Build and push web (where your styling changes are)
cd web
docker build -t jerbear472/wavesight-web:latest .
docker push jerbear472/wavesight-web:latest
cd ..

# Restart web deployment to get new image
echo "🔄 Restarting web server..."
kubectl rollout restart deployment/wavesight-web -n wavesight

# Watch the rollout
kubectl rollout status deployment/wavesight-web -n wavesight

echo "✅ Done! Your changes are live at http://134.199.179.19/dashboard"