#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🌊 WAVESITE Deployment Status${NC}"
echo -e "${BLUE}==============================${NC}"
echo

# Check pods
echo -e "${YELLOW}📦 Pods Status:${NC}"
kubectl get pods -n wavesight
echo

# Check services
echo -e "${YELLOW}🔌 Services:${NC}"
kubectl get svc -n wavesight
echo

# Get external IP
EXTERNAL_IP=$(kubectl get svc wavesight-web-service -n wavesight -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -n "$EXTERNAL_IP" ]; then
    echo -e "${GREEN}✅ Your WAVESITE application is live at:${NC}"
    echo -e "${BLUE}   http://$EXTERNAL_IP${NC}"
    echo -e "${BLUE}   http://$EXTERNAL_IP/dashboard${NC}"
    echo
    echo -e "${YELLOW}📱 Features:${NC}"
    echo -e "   • Wave-themed UI with animated logo"
    echo -e "   • Blue gradient color scheme"
    echo -e "   • Rounded corners throughout"
    echo -e "   • Real-time trend tracking"
    echo -e "   • Wave Score analytics"
else
    echo -e "${YELLOW}⏳ Waiting for LoadBalancer IP...${NC}"
fi

echo
echo -e "${BLUE}🐳 Docker Images:${NC}"
echo -e "   • jerbear472/wavesight-web:latest"
echo -e "   • jerbear472/wavesight-backend:latest"