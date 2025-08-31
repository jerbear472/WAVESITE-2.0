#!/bin/bash

echo "Building WaveSight iOS app..."

cd /Users/JeremyUys_1/Desktop/FreeWaveSight/ios-app

# First, check if the project exists
if [ -d "WaveSight.xcodeproj" ]; then
    echo "Found WaveSight.xcodeproj"
    
    # Clean build folder
    echo "Cleaning build folder..."
    xcodebuild clean -project WaveSight.xcodeproj -scheme WaveSight -configuration Debug
    
    # Build for iOS Simulator
    echo "Building for iOS Simulator..."
    xcodebuild build \
        -project WaveSight.xcodeproj \
        -scheme WaveSight \
        -configuration Debug \
        -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=latest' \
        -derivedDataPath ./build \
        CODE_SIGN_IDENTITY="" \
        CODE_SIGNING_REQUIRED=NO \
        CODE_SIGNING_ALLOWED=NO
    
    if [ $? -eq 0 ]; then
        echo "✅ Build successful!"
        echo ""
        echo "To run the app in the simulator:"
        echo "1. Open Xcode"
        echo "2. Select iPhone 15 Pro simulator"
        echo "3. Press Cmd+R to run"
    else
        echo "❌ Build failed. Please check the errors above."
    fi
else
    echo "❌ WaveSight.xcodeproj not found!"
    echo "Please complete the Xcode project creation first."
    echo ""
    echo "To create the project:"
    echo "1. In Xcode, select File > New > Project"
    echo "2. Choose iOS > App"
    echo "3. Product Name: WaveSight"
    echo "4. Organization Identifier: com.wavesight"
    echo "5. Interface: SwiftUI"
    echo "6. Language: Swift"
    echo "7. Save to: /Users/JeremyUys_1/Desktop/FreeWaveSight/ios-app"
fi