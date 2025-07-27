# 🚀 Simplest Way to Deploy Changes to Kubernetes

## Prerequisites
1. Docker installed and logged in (`docker login`)
2. kubectl configured for your cluster
3. Initial deployment already done

## The 3-Step Deploy Process

### 1️⃣ Edit the quick-deploy.sh file
```bash
# Change this line to your Docker Hub username:
DOCKER_USER="your-username"  # <-- PUT YOUR DOCKER USERNAME HERE!
```

### 2️⃣ Run the deploy script
```bash
./quick-deploy.sh
```

### 3️⃣ Check if it worked
```bash
kubectl get pods -n wavesight
```

That's it! Your changes will be live in ~2-3 minutes.

---

## First Time Setup Only

If you haven't deployed to Kubernetes before:

```bash
# 1. Create namespace
kubectl create namespace wavesight

# 2. Update image references in YAML files
# Edit kubernetes/web-deployment.yaml
# Change: image: wavesight/web:latest
# To: image: YOUR_DOCKER_USERNAME/wavesight-web:latest

# 3. Apply all configs
kubectl apply -f kubernetes/
```

---

## Even Simpler: One-Liner Deploy

After making code changes:

```bash
# For web changes
docker build -t yourusername/wavesight-web:latest web/ && docker push yourusername/wavesight-web:latest && kubectl rollout restart deployment/wavesight-web -n wavesight

# For backend changes  
docker build -t yourusername/wavesight-backend:latest backend/ && docker push yourusername/wavesight-backend:latest && kubectl rollout restart deployment/wavesight-backend -n wavesight
```

---

## Troubleshooting

**See what's happening:**
```bash
kubectl describe pod -n wavesight
kubectl logs -f deployment/wavesight-web -n wavesight
```

**If something goes wrong:**
```bash
# Roll back to previous version
kubectl rollout undo deployment/wavesight-web -n wavesight
```

**Check if pods are running:**
```bash
kubectl get pods -n wavesight
# All pods should show "Running" status
```

---

## Quick Tips

1. **Always use `:latest` tag** for simplicity during development
2. **Use `kubectl rollout restart`** to force new image pull
3. **Changes take 1-3 minutes** to go live
4. **Check logs if something fails**: `kubectl logs -f <pod-name> -n wavesight`

That's all you need! 🎉