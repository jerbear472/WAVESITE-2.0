#!/bin/bash

# 🌊 WaveSight Quick Deploy Script
# One-command deployment for production

echo "🚀 WaveSight Production Deployment"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Select deployment target:${NC}"
echo "1) iOS App Store"
echo "2) Google Play Store"
echo "3) Both"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo -e "${GREEN}📱 Building for iOS App Store...${NC}"
        npm run deploy:ios
        echo -e "${GREEN}✅ iOS build complete!${NC}"
        echo "Next: Upload archive to App Store Connect"
        ;;
    2)
        echo -e "${GREEN}🤖 Building for Google Play Store...${NC}"
        npm run deploy:android
        echo -e "${GREEN}✅ Android build complete!${NC}"
        echo "AAB file: android/app/build/outputs/bundle/release/app-release.aab"
        ;;
    3)
        echo -e "${GREEN}📱 Building for iOS App Store...${NC}"
        npm run deploy:ios
        echo -e "${GREEN}🤖 Building for Google Play Store...${NC}"
        npm run deploy:android
        echo -e "${GREEN}✅ Both builds complete!${NC}"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}📋 Post-build checklist:${NC}"
echo "[ ] Test on real devices"
echo "[ ] Verify all features work"
echo "[ ] Check crash reporting"
echo "[ ] Submit for review"
echo ""
echo "🎉 Ready for production!"