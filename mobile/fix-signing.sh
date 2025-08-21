#!/bin/bash

echo "Fixing code signing for simulator builds..."
echo "==========================================="

cd ios

# Disable code signing for Debug configuration
echo "Updating project.pbxproj to disable code signing for simulator..."

# Create a backup
cp mobile.xcodeproj/project.pbxproj mobile.xcodeproj/project.pbxproj.backup

# Use sed to disable code signing for Debug builds
sed -i '' 's/CODE_SIGN_IDENTITY = "Apple Development"/CODE_SIGN_IDENTITY = ""/g' mobile.xcodeproj/project.pbxproj
sed -i '' 's/CODE_SIGN_IDENTITY = "iPhone Developer"/CODE_SIGN_IDENTITY = ""/g' mobile.xcodeproj/project.pbxproj
sed -i '' 's/"CODE_SIGN_IDENTITY\[sdk=iphoneos\*\]" = "iPhone Developer"/"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = ""/g' mobile.xcodeproj/project.pbxproj

echo "✅ Code signing disabled for simulator builds"
echo ""
echo "Now you can:"
echo "1. Open Xcode: open mobile.xcworkspace"
echo "2. Select any iPhone simulator"
echo "3. Build and run (Cmd+R)"
echo ""
echo "Or run from command line:"
echo "npx react-native run-ios --simulator='iPhone 15'"