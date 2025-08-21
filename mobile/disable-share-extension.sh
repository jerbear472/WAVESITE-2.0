#!/bin/bash

echo "Disabling WAVESHARE extension temporarily..."

# Navigate to iOS directory
cd ios

# Remove WAVESHARE from build targets temporarily
xcodebuild -workspace mobile.xcworkspace \
  -scheme mobile \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  build

echo "You can now build just the main app without the share extension"
echo "To re-enable later, add it back in Xcode's scheme editor"