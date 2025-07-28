#!/bin/bash

echo "🚀 Deploying Wave Score Feature to Production"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  This will deploy the Wave Score feature to production${NC}"
echo -e "${YELLOW}Make sure you have applied the database migration first!${NC}"
echo ""
read -p "Have you applied the database migration (add-wave-score-column.sql)? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${BLUE}Please apply the database migration first:${NC}"
    echo "1. Go to your Supabase dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and run the contents of add-wave-score-column.sql"
    echo ""
    echo "Or run via CLI:"
    echo "psql -U your_username -d your_database -f add-wave-score-column.sql"
    exit 1
fi

# Build and push Docker images
echo -e "${BLUE}Building and pushing Docker images...${NC}"

# Build frontend
echo -e "${BLUE}Building frontend...${NC}"
cd web
docker buildx create --use --name wavesight-builder 2>/dev/null || docker buildx use wavesight-builder
docker buildx build \
  --platform linux/amd64 \
  -t jerbear472/wavesight-web:latest \
  --push \
  .

# Build backend
echo -e "${BLUE}Building backend...${NC}"
cd ../backend
docker buildx build \
  --platform linux/amd64 \
  -t jerbear472/wavesight-backend:latest \
  --push \
  .

cd ..

# Deploy to Kubernetes
echo -e "${BLUE}Deploying to Kubernetes...${NC}"

# Delete any failed pods
kubectl delete pods -n wavesight -l app=wavesight-web --field-selector=status.phase!=Running 2>/dev/null
kubectl delete pods -n wavesight -l app=wavesight-backend --field-selector=status.phase!=Running 2>/dev/null

# Force pull new images
echo -e "${BLUE}Updating deployments...${NC}"
kubectl set image deployment/wavesight-web web=jerbear472/wavesight-web:latest -n wavesight
kubectl set image deployment/wavesight-backend backend=jerbear472/wavesight-backend:latest -n wavesight

# Restart deployments to ensure fresh pull
kubectl rollout restart deployment/wavesight-web -n wavesight
kubectl rollout restart deployment/wavesight-backend -n wavesight

# Wait for rollout
echo -e "${BLUE}Waiting for deployments...${NC}"
kubectl rollout status deployment/wavesight-web -n wavesight --timeout=300s
kubectl rollout status deployment/wavesight-backend -n wavesight --timeout=300s

# Show current status
echo -e "${GREEN}✅ Deployment complete!${NC}"
kubectl get pods -n wavesight

echo ""
echo -e "${GREEN}Wave Score feature has been deployed!${NC}"
echo -e "${BLUE}Your app should be live at:${NC}"
echo "  - http://134.199.179.19/dashboard"
echo "  - http://143.244.202.19"
echo ""
echo -e "${YELLOW}Give it 1-2 minutes to fully load${NC}"
echo ""
echo -e "${GREEN}To verify the feature:${NC}"
echo "1. Navigate to the trend submission form"
echo "2. Look for the Wave Score slider in Step 2"
echo "3. Submit a test trend with a Wave Score"