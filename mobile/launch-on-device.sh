#!/bin/bash

# Launch WaveSight on iPhone with correct Metro server

echo "🚀 Launching WaveSight on your iPhone 16 Pro..."
echo "📱 Make sure your iPhone is:"
echo "   - Connected to the same Wi-Fi as your Mac"
echo "   - Unlocked and ready"
echo ""

# Get the Mac's IP address
MAC_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo "💻 Mac IP Address: $MAC_IP"

# Set the packager location for the app
echo "🔧 Configuring app to connect to Metro at $MAC_IP:8081..."

# Launch the app
echo "📲 Launching app on device..."
xcrun devicectl device process launch --device 00008140-001C29EA2233001C com.jeremyuys.wavesite

echo ""
echo "✅ App launched!"
echo ""
echo "If you see a connection error on your phone:"
echo "1. Shake your phone to open developer menu"
echo "2. Go to 'Settings' or 'Dev Settings'"
echo "3. Under 'Debug server host & port for device'"
echo "4. Enter: $MAC_IP:8081"
echo "5. Press 'Reload' in the developer menu"