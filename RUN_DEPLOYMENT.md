# 🚀 Deploy WaveSight to Kubernetes NOW

## Quick Start (3 commands)

1. **Set your Docker Hub username** (replace 'yourusername' with your actual Docker Hub username):
```bash
export DOCKER_USER=yourusername
```

2. **Login to Docker Hub** (if not already logged in):
```bash
docker login
```

3. **Run the deployment**:
```bash
./deploy-now.sh
```

That's it! The script will:
- Build both web and backend Docker images
- Push them to Docker Hub
- Deploy to Kubernetes
- Show you the status

## What to expect:
- Building images: ~2-5 minutes
- Pushing to Docker Hub: ~1-2 minutes  
- Kubernetes deployment: ~1-2 minutes
- **Total time: ~5-10 minutes**

## After deployment:

### For local Kubernetes (minikube/kind/Docker Desktop):
```bash
# Access the web app
kubectl port-forward svc/wavesight-web-service 3000:80 -n wavesight
# Then open http://localhost:3000
```

### For cloud Kubernetes (GKE/EKS/AKS):
```bash
# Get the external IP (wait for it to be assigned)
kubectl get svc -n wavesight -w
# Access via http://EXTERNAL-IP
```

## Check if everything is working:
```bash
# See all pods (should show "Running")
kubectl get pods -n wavesight

# Check web logs
kubectl logs -f deployment/wavesight-web -n wavesight

# Check backend logs  
kubectl logs -f deployment/wavesight-backend -n wavesight
```

## Troubleshooting:

If pods are crashing:
```bash
kubectl describe pod <pod-name> -n wavesight
```

If images fail to pull:
```bash
# Make sure Docker images were pushed
docker images | grep wavesight
```

## Need to update again?
Just run `./deploy-now.sh` again - it will rebuild and redeploy!