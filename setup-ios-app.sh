#!/bin/bash

echo "Setting up FreeWaveSight Mobile for iOS..."
echo "=========================================="

# Navigate to mobile directory
cd mobile

# Step 1: Install npm dependencies
echo ""
echo "Step 1: Installing npm dependencies..."
echo "--------------------------------------"
npm install

# Step 2: Navigate to iOS directory
cd ios

# Step 3: Install CocoaPods dependencies
echo ""
echo "Step 2: Installing CocoaPods..."
echo "-------------------------------"
pod install

# Step 4: Open in Xcode
echo ""
echo "Step 3: Opening in Xcode..."
echo "----------------------------"
open mobile.xcworkspace

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps in Xcode:"
echo "===================="
echo "1. Select your target device or simulator (iPhone 14 Pro recommended)"
echo "2. Click the Play button (▶️) to build and run"
echo "3. Wait for the build to complete and the app to launch"
echo ""
echo "If you encounter issues:"
echo "========================"
echo "- Clean build: Product > Clean Build Folder (Cmd+Shift+K)"
echo "- Select team: Target > Signing & Capabilities > Team"
echo "- Reset Metro: npx react-native start --reset-cache"