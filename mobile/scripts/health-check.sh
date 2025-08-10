#!/bin/bash

# WaveSight Mobile App Health Check
# Checks for common issues and provides fixes

echo "🏥 WaveSight App Health Check"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ISSUES=0
WARNINGS=0

# Function to check condition
check() {
    local test_name=$1
    local condition=$2
    local fix_suggestion=$3
    
    if eval "$condition"; then
        echo -e "${GREEN}✅ $test_name${NC}"
    else
        echo -e "${RED}❌ $test_name${NC}"
        echo -e "   Fix: $fix_suggestion"
        ((ISSUES++))
    fi
}

# Function for warnings
warn() {
    local test_name=$1
    local condition=$2
    local suggestion=$3
    
    if eval "$condition"; then
        echo -e "${GREEN}✅ $test_name${NC}"
    else
        echo -e "${YELLOW}⚠️  $test_name${NC}"
        echo -e "   Suggestion: $suggestion"
        ((WARNINGS++))
    fi
}

echo "📱 Checking React Native Setup"
echo "------------------------------"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
check "Node.js 18+" "[ $NODE_VERSION -ge 18 ]" "Install Node.js 18 or higher"

# Check if packages installed
check "node_modules exists" "[ -d node_modules ]" "Run: npm install"

# Check React Native CLI
check "React Native CLI available" "command -v npx &> /dev/null" "Install: npm install -g react-native-cli"

echo ""
echo "🍎 Checking iOS Setup"
echo "--------------------"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # Check Xcode
    check "Xcode installed" "command -v xcodebuild &> /dev/null" "Install Xcode from App Store"
    
    # Check CocoaPods
    check "CocoaPods installed" "command -v pod &> /dev/null" "Install: sudo gem install cocoapods"
    
    # Check iOS Pods
    check "iOS Pods installed" "[ -d ios/Pods ]" "Run: cd ios && pod install"
    
    # Check for Podfile.lock
    check "Podfile.lock exists" "[ -f ios/Podfile.lock ]" "Run: cd ios && pod install"
else
    echo "Skipping iOS checks (not on macOS)"
fi

echo ""
echo "🤖 Checking Android Setup"
echo "------------------------"

# Check Java
check "Java installed" "command -v java &> /dev/null" "Install Java 11 or higher"

# Check Android gradle wrapper
check "Gradle wrapper exists" "[ -f android/gradlew ]" "Run: cd android && gradle wrapper"

# Check local.properties
warn "Android SDK configured" "[ -f android/local.properties ]" "Set ANDROID_HOME and run Android Studio"

echo ""
echo "📦 Checking Dependencies"
echo "-----------------------"

# Check critical packages
check "react-native-reanimated" "npm ls react-native-reanimated &> /dev/null" "Run: npm install"
check "react-native-gesture-handler" "npm ls react-native-gesture-handler &> /dev/null" "Run: npm install"
check "react-native-screens" "npm ls react-native-screens &> /dev/null" "Run: npm install"
check "react-native-safe-area-context" "npm ls react-native-safe-area-context &> /dev/null" "Run: npm install"

echo ""
echo "🔧 Checking Configuration"
echo "------------------------"

# Check for env files
warn ".env file exists" "[ -f .env ]" "Copy .env.production to .env and configure"

# Check Metro config
check "Metro config exists" "[ -f metro.config.js ]" "Create metro.config.js"

# Check TypeScript config
check "TypeScript config exists" "[ -f tsconfig.json ]" "Create tsconfig.json"

echo ""
echo "🔍 Checking for Common Issues"
echo "-----------------------------"

# Check for duplicate React Native versions
DUPLICATE_RN=$(npm ls react-native 2>&1 | grep -c "react-native@" || true)
warn "No duplicate React Native" "[ $DUPLICATE_RN -le 1 ]" "Run: npm dedupe"

# Check for large node_modules
if [ -d node_modules ]; then
    NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
    echo -e "${YELLOW}ℹ️  node_modules size: $NODE_MODULES_SIZE${NC}"
fi

echo ""
echo "================================"
echo "📊 Health Check Summary"
echo "================================"

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Your app is healthy.${NC}"
elif [ $ISSUES -eq 0 ]; then
    echo -e "${YELLOW}✅ No critical issues, but $WARNINGS warning(s) found.${NC}"
else
    echo -e "${RED}❌ Found $ISSUES critical issue(s) and $WARNINGS warning(s).${NC}"
    echo ""
    echo "Quick fixes:"
    echo "1. Run: npm install"
    echo "2. iOS: cd ios && pod install"
    echo "3. Clean: npm run clean"
    echo "4. Reset: npm run reset"
fi

echo ""
echo "To start the app:"
echo "• iOS: npm run ios"
echo "• Android: npm run android"
echo ""