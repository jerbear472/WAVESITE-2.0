#!/bin/bash

# Super Simple Update for your LIVE server at 134.199.179.19
echo "🚀 Updating WaveSight on 134.199.179.19"

# Just restart the deployments to pull latest code
kubectl rollout restart deployment/wavesight-web -n wavesight
kubectl rollout restart deployment/wavesight-backend -n wavesight

echo "✅ Updates deploying! Changes will be live in ~1-2 minutes"
echo "🌐 Check: http://134.199.179.19/dashboard"