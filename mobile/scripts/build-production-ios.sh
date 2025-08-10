#!/bin/bash

# WaveSight iOS Production Build Script
# This script prepares and builds the iOS app for production

set -e

echo "🌊 Building WaveSight for iOS Production..."

# Navigate to ios directory
cd ios

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf build
xcodebuild clean -workspace mobile.xcworkspace -scheme mobile -configuration Release

# Install/update pods
echo "📦 Installing CocoaPods dependencies..."
pod install

# Build the app for release
echo "🔨 Building Release configuration..."
xcodebuild archive \
  -workspace mobile.xcworkspace \
  -scheme mobile \
  -configuration Release \
  -archivePath ./build/WaveSight.xcarchive \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM}" \
  PRODUCT_BUNDLE_IDENTIFIER="com.wavesight.app"

echo "✅ iOS build completed successfully!"
echo "📱 Archive located at: ./build/WaveSight.xcarchive"

# Optional: Export IPA for distribution
if [ "$1" == "--export" ]; then
  echo "📤 Exporting IPA for distribution..."
  xcodebuild -exportArchive \
    -archivePath ./build/WaveSight.xcarchive \
    -exportPath ./build \
    -exportOptionsPlist ./ExportOptions.plist
  echo "✅ IPA exported to: ./build/"
fi