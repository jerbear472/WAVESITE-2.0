#!/bin/bash

echo "Fixing Xcode signing configuration..."
cd ios

# Backup the project file
cp mobile.xcodeproj/project.pbxproj mobile.xcodeproj/project.pbxproj.backup

# Disable automatic signing and set manual signing to empty
sed -i '' 's/ProvisioningStyle = Automatic/ProvisioningStyle = Manual/g' mobile.xcodeproj/project.pbxproj
sed -i '' 's/CODE_SIGN_STYLE = Automatic/CODE_SIGN_STYLE = Manual/g' mobile.xcodeproj/project.pbxproj
sed -i '' 's/CODE_SIGN_IDENTITY = ".*"/CODE_SIGN_IDENTITY = ""/g' mobile.xcodeproj/project.pbxproj
sed -i '' 's/DEVELOPMENT_TEAM = .*/DEVELOPMENT_TEAM = "";/g' mobile.xcodeproj/project.pbxproj
sed -i '' 's/PROVISIONING_PROFILE_SPECIFIER = ".*"/PROVISIONING_PROFILE_SPECIFIER = "";/g' mobile.xcodeproj/project.pbxproj

# Disable code signing for simulator builds specifically
sed -i '' 's/"CODE_SIGN_IDENTITY\[sdk=iphonesimulator\*\]" = ".*"/"CODE_SIGN_IDENTITY[sdk=iphonesimulator*]" = ""/g' mobile.xcodeproj/project.pbxproj

echo "✅ Fixed Xcode signing configuration"
echo ""
echo "Now in Xcode:"
echo "1. Select iPhone simulator (not physical device)"
echo "2. Build and run (Cmd+R)"
echo ""
echo "The app should build without signing errors!"