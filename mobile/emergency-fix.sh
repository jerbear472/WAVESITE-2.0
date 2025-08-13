#!/bin/bash

echo "🚨 Emergency iOS Build Fix"
echo "========================="

# 1. Kill everything
echo "Stopping all processes..."
killall Xcode 2>/dev/null
pkill -f metro 2>/dev/null
pkill -f watchman 2>/dev/null
lsof -ti:8081 | xargs kill -9 2>/dev/null

# 2. Clean everything
echo "Cleaning build artifacts..."
cd ios
rm -rf ~/Library/Developer/Xcode/DerivedData/mobile-*
rm -rf build/
xcodebuild clean -workspace mobile.xcworkspace -scheme mobile -quiet

# 3. Reset pods
echo "Resetting CocoaPods..."
pod deintegrate
pod install

# 4. Go back to mobile root
cd ..

# 5. Start Metro fresh
echo "Starting Metro..."
npx react-native start --reset-cache &
METRO_PID=$!
sleep 5

# 6. Open Xcode
echo "Opening Xcode..."
open ios/mobile.xcworkspace

echo ""
echo "✅ Ready! In Xcode:"
echo "1. Wait for indexing to complete"
echo "2. Select 'mobile' scheme"
echo "3. Select 'iPhone 16' simulator"  
echo "4. Press Cmd+R to build"
echo ""
echo "If it still fails, check:"
echo "- Is the error about 'No such module'? Wait for indexing"
echo "- Is it about signing? Select a team in project settings"
echo "- Is it about WAVESHARE? Make sure that target is deleted"