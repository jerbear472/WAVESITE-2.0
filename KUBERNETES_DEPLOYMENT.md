# WaveSight Kubernetes Deployment Guide

## Architecture Overview

WaveSight is a microservices architecture with:
- **Web Dashboard** (Next.js) - Real-time trend visualization
- **Backend API** (FastAPI) - Core business logic
- **Mobile App** (React Native) - Trend spotting interface
- **ML Service** - Trend analysis and predictions
- **PostgreSQL** (via Supabase) - Primary database
- **Redis** - Caching and real-time features

## Deployment Options

### Option 1: Google Kubernetes Engine (GKE)

```bash
# 1. Create a GKE cluster
gcloud container clusters create wavesight-cluster \
  --num-nodes=3 \
  --machine-type=n1-standard-2 \
  --region=us-central1

# 2. Get cluster credentials
gcloud container clusters get-credentials wavesight-cluster --region=us-central1

# 3. Build and push Docker images
docker build -t gcr.io/YOUR-PROJECT/wavesight-web:latest -f web/Dockerfile.production web/
docker build -t gcr.io/YOUR-PROJECT/wavesight-backend:latest backend/

docker push gcr.io/YOUR-PROJECT/wavesight-web:latest
docker push gcr.io/YOUR-PROJECT/wavesight-backend:latest

# 4. Deploy to Kubernetes
kubectl apply -f kubernetes/
```

### Option 2: DigitalOcean Kubernetes

```bash
# 1. Create a DOKS cluster via DigitalOcean UI

# 2. Download kubeconfig
doctl kubernetes cluster kubeconfig save wavesight-cluster

# 3. Deploy using Helm (recommended)
helm install wavesight ./helm-charts/wavesight
```

### Option 3: Railway (Easiest)

Railway automatically handles containerized apps:

1. Go to https://railway.app/new
2. Select "Empty Project"
3. Add services:
   - New Service → Docker Image → Link your GitHub
   - Select `/web/Dockerfile.production` for the web service
   - Select `/backend/Dockerfile` for the API service
4. Add environment variables
5. Deploy!

## Quick Deploy Script

```bash
#!/bin/bash
# deploy.sh

# Build images
docker build -t wavesight/web:latest -f web/Dockerfile.production web/
docker build -t wavesight/backend:latest backend/

# Push to registry (update with your registry)
docker push wavesight/web:latest
docker push wavesight/backend:latest

# Apply Kubernetes configs
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/deployments/
kubectl apply -f kubernetes/services/
kubectl apply -f kubernetes/ingress.yaml

echo "Deployment complete!"
```

## Environment Configuration

Create a `kubernetes/secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: wavesight-secrets
type: Opaque
stringData:
  database-url: "postgresql://postgres:[password]@db.supabase.co:5432/postgres"
  supabase-url: "https://achuavagkhjenaypawij.supabase.co"
  supabase-anon-key: "your-anon-key"
  jwt-secret: "your-jwt-secret"
```

## Monitoring

```bash
# Check pod status
kubectl get pods -n wavesight

# View logs
kubectl logs -f deployment/wavesight-web
kubectl logs -f deployment/wavesight-backend

# Get service URLs
kubectl get services -n wavesight
```

## Production Considerations

1. **SSL/TLS**: Use cert-manager for automatic SSL certificates
2. **Scaling**: Configure HPA (Horizontal Pod Autoscaler)
3. **Monitoring**: Deploy Prometheus and Grafana
4. **CI/CD**: Set up GitHub Actions for automated deployments
5. **Backups**: Configure automated database backups

## Simplified Deployment for Render

If you want to stick with Render but use Docker:

1. Delete your current Render service
2. Create a new service
3. Choose "Docker" as the environment
4. Point to your GitHub repo
5. Use `web/Dockerfile.production` as the Dockerfile path
6. Set `web` as the Docker context
7. Deploy!

This avoids all the Elixir detection issues.