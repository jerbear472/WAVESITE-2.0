#!/bin/bash

echo "Disabling WAVESHARE extension from build..."
cd ios

# Create backup
cp mobile.xcodeproj/project.pbxproj mobile.xcodeproj/project.pbxproj.backup

# Remove WAVESHARE from build dependencies
sed -i '' '/WAVESHARE/d' mobile.xcodeproj/project.pbxproj

echo "✅ WAVESHARE extension disabled"
echo ""
echo "Now try building in Xcode:"
echo "1. Select iPhone simulator"  
echo "2. Build and run (Cmd+R)"
echo ""
echo "Only the main FreeWaveSight app will build (no share extension)"