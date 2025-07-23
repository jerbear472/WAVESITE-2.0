#!/bin/bash

echo "🌊 Setting up WaveSite Mobile for iOS..."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script must be run on macOS"
    exit 1
fi

# Check for Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode is not installed. Please install Xcode from the App Store."
    exit 1
fi

echo "✅ Xcode found"

# Install Node dependencies
echo "📦 Installing Node dependencies..."
npm install

# Install CocoaPods if not installed
if ! command -v pod &> /dev/null; then
    echo "📦 Installing CocoaPods..."
    sudo gem install cocoapods
fi

# Setup Ruby environment
echo "💎 Setting up Ruby environment..."
if [ -f "Gemfile" ]; then
    bundle install
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
fi

# Install iOS dependencies
echo "🍎 Installing iOS dependencies..."
cd ios
pod install --repo-update
cd ..

# Open in Xcode
echo ""
echo "✅ Setup complete!"
echo ""
echo "To open in Xcode:"
echo "  open ios/mobile.xcworkspace"
echo ""
echo "Or run from terminal:"
echo "  npm run ios"
echo ""
echo "🌊 Happy coding!"