#!/bin/bash

# Create Xcode project setup script for WaveSight iOS app

echo "Setting up WaveSight iOS Xcode project..."

# Navigate to the ios-app directory
cd /Users/JeremyUys_1/Desktop/FreeWaveSight/ios-app

# Create a proper Info.plist
cat > Info.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UIApplicationSceneManifest</key>
    <dict>
        <key>UIApplicationSupportsMultipleScenes</key>
        <false/>
        <key>UISceneConfigurations</key>
        <dict/>
    </dict>
    <key>UILaunchScreen</key>
    <dict/>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>armv7</string>
    </array>
    <key>UISupportedInterfaceOrientations~iphone</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
</plist>
EOF

# Create Assets.xcassets
mkdir -p Assets.xcassets/AppIcon.appiconset
cat > Assets.xcassets/Contents.json << 'EOF'
{
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

cat > Assets.xcassets/AppIcon.appiconset/Contents.json << 'EOF'
{
  "images" : [
    {
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

# Create Preview Content
mkdir -p "Preview Content"
cat > "Preview Content/Preview Assets.xcassets/Contents.json" << 'EOF'
{
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

echo "Project structure created. Now opening Xcode to create the project..."

# Create a simple AppleScript to automate Xcode project creation
osascript << 'END_SCRIPT'
tell application "Xcode"
    activate
end tell

tell application "System Events"
    tell process "Xcode"
        -- Wait for Xcode to be in foreground
        delay 1
        
        -- Create new project (Cmd+Shift+N)
        keystroke "n" using {command down, shift down}
        
        delay 2
        
        -- Select iOS App template
        try
            click button "App" of group 1 of scroll area 1 of window 1
        end try
        
        delay 1
        
        -- Click Next
        try
            click button "Next" of window 1
        end try
        
        delay 1
        
        -- Fill in project details
        -- Product Name
        keystroke "WaveSight"
        
        -- Tab to Team (skip)
        keystroke tab
        
        -- Tab to Organization Identifier
        keystroke tab
        keystroke "com.wavesight"
        
        -- Tab to Bundle Identifier (auto-filled)
        keystroke tab
        
        -- Tab to Interface
        keystroke tab
        -- Select SwiftUI (should be default)
        
        -- Tab to Language
        keystroke tab
        -- Select Swift (should be default)
        
        -- Tab to Storage
        keystroke tab
        keystroke tab
        
        delay 1
        
        -- Click Next
        try
            click button "Next" of window 1
        end try
        
        delay 2
    end tell
end tell
END_SCRIPT

echo "Please complete the Xcode project setup in the Xcode window."
echo ""
echo "Instructions:"
echo "1. Choose location: /Users/JeremyUys_1/Desktop/FreeWaveSight/ios-app"
echo "2. Click 'Create'"
echo "3. Once created, add existing Swift files to the project"
echo ""
echo "After project is created, run: ./build-project.sh"