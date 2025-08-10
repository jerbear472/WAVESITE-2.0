#!/bin/bash

# Fix iOS Pod Installation Script
# Resolves common pod installation issues

echo "🔧 Fixing iOS Pod Installation..."
echo "================================"

cd ios

# Clean existing pods
echo "🧹 Cleaning existing pods..."
rm -rf Pods
rm -rf build
rm -f Podfile.lock

# Clear CocoaPods cache
echo "🗑️ Clearing CocoaPods cache..."
pod cache clean --all

# Reinstall pods
echo "📦 Installing pods..."
pod install --repo-update

# Fix common permission issues
echo "🔐 Fixing permissions..."
chmod -R 755 Pods

echo "✅ Pod installation fixed!"
echo ""
echo "Next steps:"
echo "1. Run: npm run ios"
echo "2. Or open ios/mobile.xcworkspace in Xcode"