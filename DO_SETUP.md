# DigitalOcean Setup Commands

## 1. Authenticate doctl
```bash
doctl auth init
```
When prompted, paste your API token.

## 2. Verify authentication
```bash
doctl account get
```

## 3. Create Kubernetes cluster
```bash
doctl kubernetes cluster create wavesight-cluster \
  --node-pool "name=wavesight-pool;size=s-2vcpu-4gb;count=2" \
  --region=nyc1 \
  --ha=false
```

## 4. Wait for cluster creation (5-7 minutes)
```bash
# Check status
doctl kubernetes cluster list
```

## 5. Configure kubectl
```bash
doctl kubernetes cluster kubeconfig save wavesight-cluster
```

## 6. Verify cluster access
```bash
kubectl get nodes
```

## 7. Install nginx ingress controller
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/do/deploy.yaml
```

## 8. Deploy WaveSight
```bash
cd ~/Desktop/WAVESITE\ 2.0
./deploy-k8s.sh
```