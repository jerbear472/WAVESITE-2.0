#!/bin/bash
set -e

echo "🚀 Simple deployment to DigitalOcean Kubernetes..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Using pre-built images from Docker Hub...${NC}"

# Update deployment to use public demo images
cat > kubernetes/web-deployment-demo.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wavesight-web
  namespace: wavesight
spec:
  replicas: 1
  selector:
    matchLabels:
      app: wavesight-web
  template:
    metadata:
      labels:
        app: wavesight-web
    spec:
      containers:
      - name: web
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: html
          mountPath: /usr/share/nginx/html
      volumes:
      - name: html
        configMap:
          name: web-content
---
apiVersion: v1
kind: Service
metadata:
  name: wavesight-web-service
  namespace: wavesight
spec:
  selector:
    app: wavesight-web
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-content
  namespace: wavesight
data:
  index.html: |
    <!DOCTYPE html>
    <html>
    <head>
      <title>WaveSight - Live</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0a0a0a;
          color: #ffffff;
          margin: 0;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          text-align: center;
          padding: 2rem;
        }
        h1 {
          font-size: 4rem;
          margin: 0;
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        p {
          font-size: 1.5rem;
          color: #6b7280;
          margin: 1rem 0;
        }
        .status {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: #10b981;
          color: white;
          border-radius: 9999px;
          font-weight: 600;
          margin-top: 2rem;
        }
        .info {
          margin-top: 3rem;
          padding: 2rem;
          background: #1f2937;
          border-radius: 1rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>WaveSight</h1>
        <p>Your trend intelligence platform is live!</p>
        <div class="status">✓ Deployed on Kubernetes</div>
        
        <div class="info">
          <h2>What's Next?</h2>
          <p>Your full application will be deployed here once we fix the build issues.</p>
          <p>For now, this confirms your Kubernetes cluster is working perfectly!</p>
        </div>
      </div>
    </body>
    </html>
EOF

echo -e "${BLUE}Creating namespace...${NC}"
kubectl apply -f kubernetes/namespace.yaml

echo -e "${BLUE}Deploying demo web service...${NC}"
kubectl apply -f kubernetes/web-deployment-demo.yaml

echo -e "${BLUE}Creating simple ingress...${NC}"
cat > kubernetes/ingress-simple.yaml << 'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wavesight-ingress
  namespace: wavesight
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: wavesight-web-service
            port:
              number: 80
EOF

kubectl apply -f kubernetes/ingress-simple.yaml

echo -e "${GREEN}✓ Deployment complete!${NC}"

# Get Load Balancer IP
echo -e "${BLUE}Getting Load Balancer IP...${NC}"
sleep 10
LB_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ ! -z "$LB_IP" ]; then
    echo -e "${GREEN}✅ Your app is live at: http://$LB_IP${NC}"
else
    echo -e "${YELLOW}Load balancer IP pending. Check with:${NC}"
    echo "kubectl get svc -n ingress-nginx ingress-nginx-controller"
fi

echo -e "${BLUE}Pod status:${NC}"
kubectl get pods -n wavesight

# Cleanup
rm -f kubernetes/web-deployment-demo.yaml kubernetes/ingress-simple.yaml