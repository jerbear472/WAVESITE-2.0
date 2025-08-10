#!/bin/bash

# WaveSight Android Production Build Script
# This script prepares and builds the Android app for production

set -e

echo "🌊 Building WaveSight for Android Production..."

# Navigate to android directory
cd android

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build the release APK
echo "🔨 Building Release APK..."
./gradlew assembleRelease

# Build the release AAB (for Google Play)
echo "📦 Building Release Bundle (AAB)..."
./gradlew bundleRelease

echo "✅ Android build completed successfully!"
echo "📱 APK located at: app/build/outputs/apk/release/app-release.apk"
echo "📦 AAB located at: app/build/outputs/bundle/release/app-release.aab"

# Optional: Sign the APK if keystore is configured
if [ -f "$HOME/wavesight-release.keystore" ]; then
  echo "🔐 Signing APK with release keystore..."
  jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
    -keystore "$HOME/wavesight-release.keystore" \
    app/build/outputs/apk/release/app-release-unsigned.apk \
    wavesight-key
  
  # Align the APK
  zipalign -v 4 app/build/outputs/apk/release/app-release-unsigned.apk \
    app/build/outputs/apk/release/app-release-signed.apk
  
  echo "✅ APK signed and aligned!"
fi