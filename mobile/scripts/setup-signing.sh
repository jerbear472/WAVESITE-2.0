#!/bin/bash

# WaveSight App Signing Setup Script
# This script helps set up code signing for both iOS and Android

set -e

echo "🔐 WaveSight Code Signing Setup"
echo "================================"

# Function to setup iOS signing
setup_ios() {
    echo ""
    echo "📱 iOS Code Signing Setup"
    echo "-------------------------"
    echo ""
    echo "1. Open Xcode:"
    echo "   cd ios && open mobile.xcworkspace"
    echo ""
    echo "2. In Xcode, select your project and go to 'Signing & Capabilities'"
    echo ""
    echo "3. Enable 'Automatically manage signing'"
    echo ""
    echo "4. Select your Team from the dropdown"
    echo ""
    echo "5. Change Bundle Identifier to something unique:"
    echo "   Example: com.yourcompany.wavesight"
    echo ""
    echo "For manual signing:"
    echo "- Create certificates at developer.apple.com"
    echo "- Download and install provisioning profiles"
    echo ""
}

# Function to setup Android signing
setup_android() {
    echo ""
    echo "🤖 Android Code Signing Setup"
    echo "------------------------------"
    echo ""
    
    KEYSTORE_PATH="$HOME/wavesight-release.keystore"
    
    if [ -f "$KEYSTORE_PATH" ]; then
        echo "✅ Keystore already exists at: $KEYSTORE_PATH"
    else
        echo "Creating new keystore..."
        echo ""
        echo "You'll be asked for:"
        echo "- Keystore password (remember this!)"
        echo "- Key alias password (can be same as keystore password)"
        echo "- Your name and organization details"
        echo ""
        
        keytool -genkeypair -v \
            -storetype PKCS12 \
            -keystore "$KEYSTORE_PATH" \
            -alias wavesight-key \
            -keyalg RSA \
            -keysize 2048 \
            -validity 10000
        
        echo ""
        echo "✅ Keystore created at: $KEYSTORE_PATH"
    fi
    
    echo ""
    echo "Now add these to android/gradle.properties:"
    echo ""
    echo "MYAPP_UPLOAD_STORE_FILE=$KEYSTORE_PATH"
    echo "MYAPP_UPLOAD_KEY_ALIAS=wavesight-key"
    echo "MYAPP_UPLOAD_STORE_PASSWORD=your_keystore_password"
    echo "MYAPP_UPLOAD_KEY_PASSWORD=your_key_password"
    echo ""
    echo "⚠️  IMPORTANT: Never commit gradle.properties with passwords!"
    echo ""
}

# Main menu
echo ""
echo "Select platform to configure:"
echo "1) iOS"
echo "2) Android"
echo "3) Both"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        setup_ios
        ;;
    2)
        setup_android
        ;;
    3)
        setup_ios
        setup_android
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✨ Code signing setup complete!"
echo ""
echo "Next steps:"
echo "- iOS: Build with 'npm run build:ios'"
echo "- Android: Build with 'npm run build:android'"
echo ""