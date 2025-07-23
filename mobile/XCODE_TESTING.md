# Testing WaveSite Mobile in Xcode

## Quick Setup for Xcode Testing

### 1. Initial Setup (One-time)

```bash
cd mobile

# Install dependencies
npm install

# Install pods
cd ios
pod install
cd ..

# Create environment file
cp .env.example .env
```

### 2. Open in Xcode

```bash
open ios/mobile.xcworkspace
```

**⚠️ IMPORTANT**: Always open `.xcworkspace`, not `.xcodeproj`

### 3. Configure Xcode Settings

1. **Select Target**: In Xcode, select the "mobile" target
2. **Signing**: 
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Team (or add your Apple ID)
3. **Bundle ID**: Change to something unique like `com.yourname.wavesite`

### 4. Start Metro Bundler

In a separate terminal:
```bash
cd mobile
npm start
```

Leave this running!

### 5. Run on Simulator

1. Select a simulator (e.g., iPhone 15 Pro)
2. Press ⌘+R or click the Play button
3. Wait for build to complete

### 6. Run on Physical Device

1. Connect your iPhone via USB
2. Select your device from the device list
3. Trust the computer on your iPhone if prompted
4. Press ⌘+R to build and run

## Testing Features

### Authentication Flow
1. Launch app → Welcome screen
2. Tap "Get Started" → Register screen
3. Create account with email/username/password
4. Auto-login after registration

### Screen Recording
1. Login to the app
2. Go to Recording tab
3. Select platform (TikTok/Instagram)
4. Grant permissions when prompted
5. App will record screen activity

### Trends Browsing
1. Go to Trends tab
2. Filter by category
3. Pull to refresh

### Profile
1. Go to Profile tab
2. View stats and earnings
3. Access settings

## Common Xcode Issues

### Build Fails
```bash
# Clean build
Product → Clean Build Folder (⌘+Shift+K)

# Reset pods
cd ios
pod deintegrate
pod install
```

### Metro Connection Issues
1. Shake device/simulator
2. Select "Configure Bundler"
3. Enter: `localhost:8081`

### Signing Issues
- Ensure you have a valid Apple Developer account
- Check that bundle ID is unique
- Try manual signing if automatic fails

### Permission Issues
The app needs these permissions:
- Screen Recording (iOS 11+)
- Camera (for screenshots)
- Photo Library (to save recordings)

## Debug Mode

1. Shake device or press ⌘+D in simulator
2. Select "Debug with Chrome" or use Flipper
3. Use React Native Debugger for better experience

## Build for Testing

### Debug Build
Default when running from Xcode

### Release Build
1. Edit Scheme: Product → Scheme → Edit Scheme
2. Change Build Configuration to "Release"
3. Build and run

## Tips

- Keep Metro bundler running in background
- Use iOS 15+ for best compatibility
- Test on real device for screen recording
- Check console logs in Xcode for native errors
- Use Safari Web Inspector for WebView debugging

## Quick Commands

```bash
# Run on specific simulator
npm run ios -- --simulator="iPhone 15 Pro"

# Run on device by name
npm run ios -- --device="Jeremy's iPhone"

# List available devices
xcrun simctl list devices

# Reset Metro cache
npm start -- --reset-cache
```