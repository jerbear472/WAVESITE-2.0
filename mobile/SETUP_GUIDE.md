# WaveSite Mobile App Setup for Xcode

## Prerequisites
- macOS with Xcode 14+ installed
- Node.js 18+ and npm
- CocoaPods (`sudo gem install cocoapods`)
- React Native CLI (`npm install -g react-native-cli`)

## Quick Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. iOS Setup

```bash
# Install Ruby dependencies
bundle install

# Install iOS dependencies
cd ios
bundle exec pod install
cd ..
```

### 3. Configure Environment

Create `.env` file in the mobile directory:
```bash
API_URL=http://localhost:8000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Open in Xcode

```bash
open ios/mobile.xcworkspace
```

**Important**: Open the `.xcworkspace` file, not `.xcodeproj`

### 5. Configure Xcode

1. Select your development team in Signing & Capabilities
2. Update bundle identifier if needed (com.yourcompany.wavesite)
3. Select your target device or simulator

### 6. Run the App

#### Option 1: From Xcode
- Press ⌘+R or click the Play button

#### Option 2: From Terminal
```bash
npm run ios
# or for specific device
npm run ios -- --device "iPhone 15 Pro"
```

## Troubleshooting

### Pod Install Issues
```bash
cd ios
pod deintegrate
pod install --repo-update
```

### Build Failures
1. Clean build folder: ⌘+Shift+K in Xcode
2. Clear derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
3. Reset Metro cache: `npx react-native start --reset-cache`

### Metro Connection Issues
If the app can't connect to Metro bundler:
1. Check Metro is running: `npm start`
2. Shake device/simulator and select "Configure Bundler"
3. Ensure your Mac and device are on same network

## Development Tips

### Hot Reload
- Shake device or press ⌘+D in simulator
- Enable "Fast Refresh"

### Debug Mode
- Shake device or press ⌘+D in simulator
- Select "Debug with Chrome" or "Debug with Flipper"

### Screen Recording Feature
The app uses native modules for screen recording. Make sure to:
1. Grant screen recording permissions when prompted
2. Test on real device for best results

## Common Commands

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on specific iOS device
npm run ios -- --device "iPhone 15 Pro"

# Run on simulator
npm run ios -- --simulator "iPhone 15 Pro"

# Clean and rebuild
cd ios && xcodebuild clean && cd ..
npm run ios

# Reset everything
watchman watch-del-all
rm -rf node_modules
npm install
cd ios && pod install && cd ..
npm start --reset-cache
```