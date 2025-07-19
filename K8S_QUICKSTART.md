# WaveSight Kubernetes Quick Start

## Prerequisites

- Kubernetes cluster (GKE, EKS, DigitalOcean, etc.)
- kubectl configured to access your cluster
- Docker installed locally
- Domain name (optional but recommended)

## Option 1: DigitalOcean Kubernetes (Easiest)

```bash
# 1. Create a cluster on DigitalOcean
doctl kubernetes cluster create wavesight-cluster \
  --node-pool "name=default;size=s-2vcpu-4gb;count=3"

# 2. Get credentials
doctl kubernetes cluster kubeconfig save wavesight-cluster

# 3. Install nginx ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/do/deploy.yaml

# 4. Deploy WaveSight
./deploy-k8s.sh
```

## Option 2: Google Kubernetes Engine (GKE)

```bash
# 1. Create cluster
gcloud container clusters create wavesight-cluster \
  --num-nodes=3 \
  --machine-type=e2-standard-2 \
  --region=us-central1

# 2. Get credentials
gcloud container clusters get-credentials wavesight-cluster --region=us-central1

# 3. Deploy
./deploy-k8s.sh
```

## Option 3: Local Development (Minikube)

```bash
# 1. Start Minikube
minikube start --cpus 4 --memory 8192

# 2. Enable ingress
minikube addons enable ingress

# 3. Build images locally
eval $(minikube docker-env)
docker build -t wavesight/web:latest -f web/Dockerfile.production web/
docker build -t wavesight/backend:latest backend/

# 4. Deploy
kubectl apply -f kubernetes/

# 5. Access services
minikube service wavesight-web-service -n wavesight
```

## Quick Deploy Commands

```bash
# Deploy everything at once
kubectl apply -f kubernetes/

# Check status
kubectl get all -n wavesight

# View logs
kubectl logs -f deployment/wavesight-web -n wavesight
kubectl logs -f deployment/wavesight-backend -n wavesight

# Port forward for local access (no ingress needed)
kubectl port-forward service/wavesight-web-service 3000:80 -n wavesight
kubectl port-forward service/wavesight-backend-service 8000:80 -n wavesight
```

## Update Environment Variables

1. Edit `kubernetes/secrets.yaml` with your actual values
2. Update ingress hosts in `kubernetes/ingress.yaml`
3. Update image registry in `deploy-k8s.sh` if using custom registry

## Access Your Application

After deployment:
- Web UI: http://localhost:3000 (with port-forward)
- API: http://localhost:8000 (with port-forward)

Or with ingress:
- Web UI: https://wavesight.yourdomain.com
- API: https://api.wavesight.yourdomain.com

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n wavesight

# Describe problematic pod
kubectl describe pod <pod-name> -n wavesight

# Check logs
kubectl logs <pod-name> -n wavesight

# Delete and redeploy
kubectl delete namespace wavesight
./deploy-k8s.sh
```