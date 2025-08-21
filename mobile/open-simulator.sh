#!/bin/bash

echo "Opening iOS Simulator..."

# Open simulator
open -a Simulator

# Wait a moment for simulator to open
sleep 3

# Boot iPhone 16 if not already booted
xcrun simctl boot "iPhone 16" 2>/dev/null || echo "iPhone 16 already booted"

echo "✅ Simulator is ready!"
echo ""
echo "In Xcode:"
echo "1. Select 'iPhone 16' from device dropdown"
echo "2. Make sure 'Automatically manage signing' is OFF"
echo "3. Set Signing Certificate to 'Don't Code Sign'"
echo "4. Build and run (Cmd+R)"