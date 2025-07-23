# WaveSight Mobile Development Setup

You'll need to install either Xcode (for iOS) or Android Studio (for Android) to run the mobile app.

## Option 1: iOS Setup (Mac only)

### 1. Install Xcode
- Open the Mac App Store
- Search for "Xcode"
- Install (it's large, ~15GB)
- Open Xcode once and accept the license

### 2. Install CocoaPods
```bash
sudo gem install cocoapods
# or with Homebrew:
brew install cocoapods
```

### 3. Install iOS dependencies
```bash
cd "/Users/JeremyUys_1/Desktop/WAVESITE 2.0/mobile"
cd ios && pod install && cd ..
```

### 4. Run the app
```bash
npm run ios
```

## Option 2: Android Setup

### 1. Install Android Studio
- Download from: https://developer.android.com/studio
- Install and open Android Studio
- Go through the setup wizard

### 2. Install Android SDK
In Android Studio:
- Open Preferences/Settings
- Appearance & Behavior → System Settings → Android SDK
- Install:
  - Android SDK Platform 33
  - Android SDK Build-Tools 33.0.0
  - Android SDK Command-line Tools

### 3. Set environment variables
Add to your `~/.zshrc` or `~/.bash_profile`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then reload:
```bash
source ~/.zshrc
```

### 4. Create Virtual Device
In Android Studio:
- Tools → AVD Manager
- Create Virtual Device
- Choose Pixel 4 or similar
- Select system image (API 33)

### 5. Run the app
```bash
cd "/Users/JeremyUys_1/Desktop/WAVESITE 2.0/mobile"
npm run android
```

## Option 3: Quick Alternative - Use Expo Go (Fastest)

If you want to test quickly without full setup:

### 1. Install Expo CLI
```bash
npm install -g expo-cli
```

### 2. Convert to Expo (temporary)
```bash
cd "/Users/JeremyUys_1/Desktop/WAVESITE 2.0/mobile"
npx expo init --template blank-typescript WaveSightExpo
# Copy your src files to the new Expo project
```

### 3. Run with Expo
```bash
cd WaveSightExpo
npm start
# Scan QR code with Expo Go app on your phone
```

## Testing Without Native Features

For now, you can test the UI and Supabase integration using the web dashboard at:
**http://134.199.179.19**

The mobile app requires native development setup for screen recording features.

## Recommended Next Steps

1. **For Quick Testing**: Use the web dashboard
2. **For Full Features**: Install Xcode (easier on Mac)
3. **For Cross-Platform**: Set up Android Studio

Once you have either Xcode or Android Studio installed, the mobile app will run with all screen recording features!