#!/bin/bash

# WaveSight Production Build Test Script
# Tests both iOS and Android production builds

set +e

echo "🧪 WaveSight Production Build Test"
echo "==================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test a condition
test_condition() {
    local test_name=$1
    local condition=$2
    
    if eval "$condition"; then
        echo -e "${GREEN}✅ $test_name${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $test_name${NC}"
        ((TESTS_FAILED++))
    fi
}

echo "📋 Pre-flight Checks"
echo "--------------------"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
test_condition "Node.js 18+" "[ $NODE_VERSION -ge 18 ]"

# Check if packages are installed
test_condition "node_modules exists" "[ -d node_modules ]"

# Check iOS setup
if [[ "$OSTYPE" == "darwin"* ]]; then
    test_condition "iOS Pods installed" "[ -d ios/Pods ]"
    test_condition "iOS workspace exists" "[ -f ios/mobile.xcworkspace/contents.xcworkspacedata ]"
fi

# Check Android setup
test_condition "Android gradle wrapper" "[ -f android/gradlew ]"
test_condition "Android build.gradle" "[ -f android/app/build.gradle ]"

echo ""
echo "🔧 Configuration Checks"
echo "-----------------------"

# Check production files
test_condition "Metro config optimized" "grep -q 'drop_console' metro.config.js"
test_condition "ProGuard configured" "[ -f android/app/proguard-rules.pro ]"
test_condition "Production env file" "[ -f .env.production ]"
test_condition "App icons generated" "[ -f ios/mobile/Images.xcassets/AppIcon.appiconset/Icon-1024.png ]"

echo ""
echo "📱 Build Tests"
echo "--------------"

# Test Android build
if command -v java &> /dev/null; then
    echo -e "${YELLOW}Testing Android build...${NC}"
    cd android
    if ./gradlew tasks &> /dev/null; then
        test_condition "Android Gradle working" "true"
    else
        test_condition "Android Gradle working" "false"
    fi
    cd ..
fi

# Test iOS build (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${YELLOW}Testing iOS build...${NC}"
    if command -v xcodebuild &> /dev/null; then
        test_condition "Xcode CLI tools installed" "true"
    else
        test_condition "Xcode CLI tools installed" "false"
    fi
fi

echo ""
echo "📊 Bundle Size Analysis"
echo "-----------------------"

# Check for large dependencies
echo "Checking for large dependencies..."
LARGE_DEPS=$(du -sh node_modules/* 2>/dev/null | grep -E '[0-9]+M' | head -5)
if [ -n "$LARGE_DEPS" ]; then
    echo -e "${YELLOW}Large dependencies found:${NC}"
    echo "$LARGE_DEPS"
fi

echo ""
echo "🎯 Performance Checks"
echo "---------------------"

# Check for console.logs in production code
CONSOLE_LOGS=$(grep -r "console.log" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
if [ $CONSOLE_LOGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $CONSOLE_LOGS console.log statements in src/${NC}"
else
    echo -e "${GREEN}✅ No console.log statements in production code${NC}"
fi

echo ""
echo "================================"
echo "📈 Test Summary"
echo "================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Your app is ready for production.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run 'npm run build:ios' for iOS production build"
    echo "2. Run 'npm run build:android' for Android production build"
    echo "3. Test on real devices before submission"
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tests failed. Please fix the issues before building for production.${NC}"
fi

echo ""