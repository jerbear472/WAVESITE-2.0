# WaveSight Production Deployment Guide

## 🚀 Production Setup

This guide covers everything needed to deploy WaveSight to production on iOS App Store and Google Play Store.

## 📋 Prerequisites

- macOS with Xcode 15+ (for iOS)
- Android Studio (for Android)
- Apple Developer Account ($99/year)
- Google Play Developer Account ($25 one-time)
- Node.js 18+
- React Native CLI

## 🏗️ Build Configuration

### Environment Variables

1. Copy `.env.production` and fill in your actual values:
```bash
cp .env.production .env
```

2. Update with your production API endpoints and keys.

## 📱 iOS Production Build

### 1. Code Signing Setup

1. Open Xcode:
```bash
cd ios && open mobile.xcworkspace
```

2. Select your development team in Signing & Capabilities
3. Change bundle identifier to your unique ID (e.g., `com.yourcompany.wavesight`)

### 2. Build for Production

```bash
# Clean and install dependencies
cd ios && pod install

# Build release
npm run ios --configuration Release

# Or use the build script
bash scripts/build-production-ios.sh
```

### 3. Archive and Upload

1. In Xcode: Product → Archive
2. Distribute App → App Store Connect
3. Upload to App Store Connect
4. Submit for review in App Store Connect

## 🤖 Android Production Build

### 1. Generate Release Keystore

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore wavesight-release.keystore -alias wavesight-key -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Configure Signing

Add to `android/gradle.properties`:
```properties
MYAPP_UPLOAD_STORE_FILE=wavesight-release.keystore
MYAPP_UPLOAD_KEY_ALIAS=wavesight-key
MYAPP_UPLOAD_STORE_PASSWORD=your_keystore_password
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

### 3. Build for Production

```bash
# Build APK
cd android && ./gradlew assembleRelease

# Build AAB for Google Play
cd android && ./gradlew bundleRelease

# Or use the build script
bash scripts/build-production-android.sh
```

### 4. Upload to Google Play

1. Go to Google Play Console
2. Create new app
3. Upload AAB file from `android/app/build/outputs/bundle/release/`
4. Fill in store listing details
5. Submit for review

## 🎯 Performance Optimizations

### Implemented Optimizations:

1. **Hermes Engine**: Enabled for better performance
2. **ProGuard**: Configured for code minification
3. **Bundle Splitting**: APK split by ABI for smaller downloads
4. **Image Optimization**: Using FastImage for better caching
5. **Console Removal**: Console statements removed in production
6. **Lazy Loading**: Screens load on demand
7. **Reanimated**: Hardware-accelerated animations

### Bundle Size Targets:

- iOS: < 30MB
- Android: < 20MB per ABI

## 🔒 Security Checklist

- [x] Remove all console.log statements
- [x] Enable ProGuard minification
- [x] Secure API keys in environment variables
- [x] Enable certificate pinning (optional)
- [x] Implement proper authentication
- [x] Encrypt sensitive storage (MMKV)

## 📊 Monitoring & Analytics

### Crash Reporting
- Sentry DSN configured in `.env.production`
- Automatic crash reporting in production

### Performance Monitoring
- React Native Performance library integrated
- Custom performance metrics tracked

## 🧪 Testing Production Builds

### iOS Testing
```bash
# Install on device
npm run ios --device "Your iPhone" --configuration Release
```

### Android Testing
```bash
# Install on device
npm run android --variant=release
```

## 📝 Pre-launch Checklist

- [ ] Update version numbers in:
  - `package.json`
  - `ios/mobile.xcodeproj` (Marketing Version)
  - `android/app/build.gradle` (versionCode, versionName)
- [ ] Test on real devices
- [ ] Verify all API endpoints
- [ ] Check app permissions
- [ ] Review app store descriptions
- [ ] Prepare screenshots for stores
- [ ] Test deep linking
- [ ] Verify push notifications
- [ ] Check offline functionality
- [ ] Performance testing
- [ ] Security audit

## 🚢 Deployment Commands

### Quick Deploy iOS
```bash
npm run deploy:ios
```

### Quick Deploy Android
```bash
npm run deploy:android
```

## 🆘 Troubleshooting

### iOS Build Issues
```bash
# Clean build
cd ios && rm -rf build && pod deintegrate && pod install
```

### Android Build Issues
```bash
# Clean build
cd android && ./gradlew clean && ./gradlew --stop
```

### Metro Issues
```bash
# Reset Metro cache
npx react-native start --reset-cache
```

## 📱 App Store Guidelines

### iOS App Store
- Follow Human Interface Guidelines
- Provide 5.5" and 6.5" screenshots
- App preview video (optional)
- Age rating questionnaire

### Google Play Store
- Follow Material Design Guidelines
- Provide screenshots for phone and tablet
- Feature graphic (1024x500)
- Privacy policy URL required

## 🎉 Post-Launch

1. Monitor crash reports
2. Respond to user reviews
3. Track analytics
4. Plan regular updates
5. A/B test new features

## 📞 Support

For production issues:
- Create issue in project repository
- Contact: support@wavesight.app

---

**Last Updated**: October 2024
**Version**: 1.0.0